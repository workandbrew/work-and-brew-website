// Read-only numbers from outside sources for the Team Hub's Growth & Social page.
// Each source is optional: if its keys aren't set in Vercel it reports { connected: false }.
// Any platform can also be updated by hand (growth_manual table), e.g. Lemon8, which has no public API.
//
// Env (Vercel → Settings → Environment Variables):
//   GA_PROPERTY_ID, GA_CLIENT_EMAIL, GA_PRIVATE_KEY          Google Analytics 4 (service account, Viewer access)
//   BREVO_API_KEY, BREVO_LIST_ID (optional)                  Brevo email list
//   INSTAGRAM_ACCESS_TOKEN                                   Instagram Business or Creator account ("Instagram API
//                                                            with Instagram Login"; no Facebook Page needed). The daily
//                                                            run refreshes it and keeps the newest copy in growth_tokens.
//   YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID                      YouTube Data API
//   TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET                  TikTok (Login Kit); then "Connect TikTok" in the hub

import { createSign } from "node:crypto";
import { db } from "./sms.js";

const env = (k) => (process.env[k] || "").trim();
const TIMEOUT_MS = 8000;

async function getJSON(url, opts = {}) {
  const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || data?.message || data?.error_description || `HTTP ${res.status}`);
  return data;
}

// ---- Google Analytics 4 ----

const b64url = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");

async function googleToken(email, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url({
    iss: email, scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  })}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(privateKey.replace(/\\n/g, "\n"), "base64url");
  const data = await getJSON("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }),
  });
  return data.access_token;
}

export async function analytics() {
  const property = env("GA_PROPERTY_ID"), email = env("GA_CLIENT_EMAIL"), key = env("GA_PRIVATE_KEY");
  if (!property || !email || !key) return { connected: false };
  const token = await googleToken(email, key);
  const report = (body) => getJSON(`https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const [daily, prior, sources] = await Promise.all([
    report({ dateRanges: [{ startDate: "29daysAgo", endDate: "today" }], dimensions: [{ name: "date" }], metrics: [{ name: "activeUsers" }], orderBys: [{ dimension: { dimensionName: "date" } }] }),
    report({ dateRanges: [{ startDate: "59daysAgo", endDate: "30daysAgo" }], metrics: [{ name: "activeUsers" }] }),
    report({ dateRanges: [{ startDate: "29daysAgo", endDate: "today" }], dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 6 }),
  ]);
  const num = (r) => Number(r?.metricValues?.[0]?.value || 0);
  const days = (daily.rows || []).map((r) => ({ date: r.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"), value: num(r) }));
  return {
    connected: true,
    visitors30: days.reduce((n, d) => n + d.value, 0),
    prior30: num(prior.rows?.[0]),
    daily: days,
    sources: (sources.rows || []).map((r) => ({ label: r.dimensionValues[0].value, value: num(r) })),
  };
}

// ---- Brevo ----

export async function brevo() {
  const key = env("BREVO_API_KEY");
  if (!key) return { connected: false };
  const headers = { "api-key": key, accept: "application/json" };
  const list = env("BREVO_LIST_ID");
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const day = new Date(Date.now() - 864e5).toISOString();
  const [total, recent, last24] = await Promise.all([
    list ? getJSON(`https://api.brevo.com/v3/contacts/lists/${list}`, { headers }).then((d) => d.totalSubscribers ?? d.uniqueSubscribers ?? 0)
      : getJSON("https://api.brevo.com/v3/contacts?limit=1", { headers }).then((d) => d.count ?? 0),
    getJSON(`https://api.brevo.com/v3/contacts?limit=1&createdSince=${encodeURIComponent(since)}`, { headers }).then((d) => d.count ?? 0).catch(() => null),
    getJSON(`https://api.brevo.com/v3/contacts?limit=1&createdSince=${encodeURIComponent(day)}`, { headers }).then((d) => d.count ?? 0).catch(() => null),
  ]);
  return { connected: true, subscribers: total, new30: recent, new24: last24 };
}

// ---- Social ----

// The newest Instagram token: the refreshed copy in the database if there is one, else the Vercel env value.
async function instagramToken() {
  try {
    const { data } = await db().from("growth_tokens").select("token").eq("platform", "instagram").maybeSingle();
    if (data?.token) return data.token;
  } catch { /* table not set up yet: fall back to env */ }
  return env("INSTAGRAM_ACCESS_TOKEN");
}

export async function instagram() {
  const token = await instagramToken();
  if (!token) return { connected: false };
  const d = await getJSON(`https://graph.instagram.com/v21.0/me?fields=followers_count,media_count,username&access_token=${encodeURIComponent(token)}`);
  const [likes, views30] = await Promise.all([instagramLikes(token).catch(() => null), instagramViews30(token).catch(() => null)]);
  return { connected: true, followers: d.followers_count ?? 0, posts: d.media_count ?? 0, likes, views: views30, viewsWindow: views30 == null ? null : "30d", handle: d.username ? `@${d.username}` : null };
}

// Total likes across posts (Instagram has no account-wide like count). Up to 500 posts.
async function instagramLikes(token) {
  let url = `https://graph.instagram.com/v21.0/me/media?fields=like_count&limit=100&access_token=${encodeURIComponent(token)}`, total = 0;
  for (let page = 0; url && page < 5; page++) {
    const d = await getJSON(url);
    for (const m of d.data || []) total += Number(m.like_count || 0);
    url = d.paging?.next || null;
  }
  return total;
}
// Views in the last 30 days (Instagram only reports views over a window, and only with insights access)
async function instagramViews30(token) {
  const until = Math.floor(Date.now() / 1000), since = until - 30 * 86400;
  const d = await getJSON(`https://graph.instagram.com/v21.0/me/insights?metric=views&period=day&metric_type=total_value&since=${since}&until=${until}&access_token=${encodeURIComponent(token)}`);
  const v = d.data?.[0]?.total_value?.value;
  return v == null ? null : Number(v);
}

// Long-lived Instagram tokens last 60 days; refreshing extends them another 60. Run by /api/cron.
export async function refreshInstagramToken() {
  const token = await instagramToken();
  if (!token) return { skipped: true };
  const d = await getJSON(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`);
  const { error } = await db().from("growth_tokens")
    .upsert({ platform: "instagram", token: d.access_token, refreshed_at: new Date().toISOString() }, { onConflict: "platform" });
  if (error) throw new Error(`Couldn't store the refreshed token (${error.message}). Has supabase/sms.sql been run?`);
  return { refreshed: true, expiresInDays: Math.round((d.expires_in || 0) / 86400) };
}

export async function youtube() {
  const key = env("YOUTUBE_API_KEY"), channel = env("YOUTUBE_CHANNEL_ID");
  if (!key || !channel) return { connected: false };
  const d = await getJSON(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${encodeURIComponent(channel)}&key=${encodeURIComponent(key)}`);
  const s = d.items?.[0]?.statistics;
  if (!s) throw new Error("Channel not found. Check YOUTUBE_CHANNEL_ID.");
  const likes = await youtubeLikes(key, channel).catch(() => null);
  return { connected: true, followers: Number(s.subscriberCount || 0), views: Number(s.viewCount || 0), likes, posts: Number(s.videoCount || 0), handle: d.items[0].snippet?.customUrl || null };
}

// Total likes across the channel's uploads (YouTube only reports likes per video). Up to 500 videos.
async function youtubeLikes(key, channel) {
  const k = encodeURIComponent(key);
  const uploads = "UU" + channel.slice(2); // a channel's uploads playlist id
  let pageToken = "", total = 0;
  for (let page = 0; page < 10; page++) {
    const pl = await getJSON(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${uploads}&key=${k}${pageToken ? `&pageToken=${pageToken}` : ""}`);
    const ids = (pl.items || []).map((i) => i.contentDetails?.videoId).filter(Boolean);
    if (ids.length) {
      const v = await getJSON(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids.join(",")}&key=${k}`);
      for (const it of v.items || []) total += Number(it.statistics?.likeCount || 0);
    }
    if (!pl.nextPageToken) break;
    pageToken = pl.nextPageToken;
  }
  return total;
}

// TikTok: a department head clicks "Connect TikTok" once (see /api/connect). TikTok hands back a
// refresh token that rotates on every use, so the newest one always lives in growth_tokens.
const TIKTOK_REDIRECT = "https://workandbrew.app/api/connect";

async function storedToken(platform) {
  try {
    const { data } = await db().from("growth_tokens").select("token").eq("platform", platform).maybeSingle();
    return data?.token || null;
  } catch { return null; }
}
async function storeToken(platform, token) {
  const { error } = await db().from("growth_tokens")
    .upsert({ platform, token, refreshed_at: new Date().toISOString() }, { onConflict: "platform" });
  if (error) throw new Error(`Couldn't store the ${platform} token (${error.message}). Has supabase/sms.sql been run?`);
}

const tiktokTokenCall = (params) => getJSON("https://open.tiktokapis.com/v2/oauth/token/", {
  method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ client_key: env("TIKTOK_CLIENT_KEY"), client_secret: env("TIKTOK_CLIENT_SECRET"), ...params }),
});

export const tiktokReady = () => !!(env("TIKTOK_CLIENT_KEY") && env("TIKTOK_CLIENT_SECRET"));

// Where "Connect TikTok" sends the browser. `state` is checked when TikTok sends the person back.
export function tiktokAuthUrl(state) {
  return "https://www.tiktok.com/v2/auth/authorize/?" + new URLSearchParams({
    // Add video.list in the TikTok developer app and set TIKTOK_SCOPES=user.info.basic,user.info.stats,video.list
    // in Vercel (then reconnect) to get total views.
    client_key: env("TIKTOK_CLIENT_KEY"), scope: env("TIKTOK_SCOPES") || "user.info.basic,user.info.stats", response_type: "code",
    redirect_uri: TIKTOK_REDIRECT, state,
  });
}

export async function tiktokFinishConnect(code) {
  const tok = await tiktokTokenCall({ code, grant_type: "authorization_code", redirect_uri: TIKTOK_REDIRECT });
  if (!tok.refresh_token) throw new Error(tok.error_description || "TikTok didn't return a token.");
  await storeToken("tiktok", tok.refresh_token);
}

export async function tiktok() {
  if (!tiktokReady()) return { connected: false };
  const refresh = (await storedToken("tiktok")) || env("TIKTOK_REFRESH_TOKEN");
  if (!refresh) return { connected: false, canConnect: true };
  const tok = await tiktokTokenCall({ grant_type: "refresh_token", refresh_token: refresh });
  if (tok.refresh_token && tok.refresh_token !== refresh) await storeToken("tiktok", tok.refresh_token);
  const d = await getJSON("https://open.tiktokapis.com/v2/user/info/?fields=follower_count,likes_count,video_count,display_name", {
    headers: { authorization: `Bearer ${tok.access_token}` },
  });
  const u = d.data?.user || {};
  const views = await tiktokViews(tok.access_token).catch(() => null); // needs the video.list scope
  return { connected: true, followers: u.follower_count ?? 0, likes: u.likes_count ?? 0, views, posts: u.video_count ?? 0, handle: u.display_name || null };
}

async function tiktokViews(accessToken) {
  let cursor = 0, total = 0;
  for (let page = 0; page < 10; page++) {
    const d = await getJSON("https://open.tiktokapis.com/v2/video/list/?fields=view_count", {
      method: "POST", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ max_count: 20, ...(cursor ? { cursor } : {}) }),
    });
    if (d.error && d.error.code && d.error.code !== "ok") throw new Error(d.error.message || d.error.code);
    for (const v of d.data?.videos || []) total += Number(v.view_count || 0);
    if (!d.data?.has_more) break;
    cursor = d.data.cursor;
  }
  return total;
}

// ---- Manual numbers (Lemon8, or any platform before it's connected) ----

export const PLATFORMS = ["instagram", "tiktok", "youtube", "lemon8"];

async function manualLatest() {
  const { data, error } = await db().from("growth_manual")
    .select("platform, followers, recorded_on, recorded_by").order("recorded_on", { ascending: false }).limit(200);
  if (error) return null;
  const out = {};
  for (const r of data || []) {
    out[r.platform] ??= [];
    if (out[r.platform].length < 2) out[r.platform].push(r);
  }
  return out;
}

export async function saveManual(platform, followers, by) {
  const p = String(platform || "").toLowerCase();
  const n = Math.round(Number(followers));
  if (!PLATFORMS.includes(p)) return { status: 400, error: "Unknown platform." };
  if (!Number.isFinite(n) || n < 0) return { status: 400, error: "Enter a follower count." };
  const { error } = await db().from("growth_manual").insert({ platform: p, followers: n, recorded_by: by });
  if (error) return { status: 500, error: `Couldn't save (${error.message}). Has supabase/sms.sql been run?` };
  return { status: 200 };
}

// Everything the Growth & Social page needs. A failing source reports its error instead of breaking the page.
export async function growthSnapshot() {
  const settle = (p) => p.then((v) => v, (e) => ({ connected: true, error: e.message }));
  const [ga, email, ig, tt, yt, manual] = await Promise.all([
    settle(analytics()), settle(brevo()), settle(instagram()), settle(tiktok()), settle(youtube()), manualLatest(),
  ]);
  const social = { instagram: ig, tiktok: tt, youtube: yt, lemon8: { connected: false } };
  for (const p of PLATFORMS) {
    const rows = manual?.[p];
    if (!rows?.length) continue;
    const ageDays = (Date.now() - new Date(`${rows[0].recorded_on}T12:00:00Z`).getTime()) / 864e5;
    social[p].manual = { followers: rows[0].followers, previous: rows[1]?.followers ?? null, on: rows[0].recorded_on, by: rows[0].recorded_by, fresh: ageDays <= 7 };
  }
  const week = await recordAndCompare(social).catch(() => null);
  if (week) for (const p of PLATFORMS) if (social[p] && week[p] != null) social[p].weekGain = week[p];
  return { website: ga, email, social, manualReady: !!manual, followersWeekGain: week ? Object.values(week).reduce((n, v) => n + (v || 0), 0) : null };
}

// Save today's numbers (one row per platform per day), then compare with about a week ago.
async function recordAndCompare(social) {
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const now = {};
  for (const p of PLATFORMS) {
    const s = social[p];
    const followers = s?.connected && !s.error ? s.followers : s?.manual?.followers;
    if (followers == null) continue;
    now[p] = followers;
  }
  const rows = Object.entries(now).map(([platform, followers]) => ({
    platform, day, followers, likes: social[platform]?.likes ?? null, views: social[platform]?.views ?? null, updated_at: new Date().toISOString(),
  }));
  if (rows.length) {
    const { error } = await db().from("growth_daily").upsert(rows, { onConflict: "platform,day" });
    if (error) return null; // table not created yet
  }
  const weekAgo = new Date(Date.now() - 7 * 864e5).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const { data } = await db().from("growth_daily").select("platform, day, followers").gte("day", weekAgo).lt("day", day).order("day");
  const out = {};
  for (const p of Object.keys(now)) {
    const first = (data || []).find((r) => r.platform === p && r.followers != null); // oldest in the last 7 days
    out[p] = first ? now[p] - first.followers : null;
  }
  return out;
}
