// Read-only numbers from outside sources for the Team Hub's Growth & Social page.
// Each source is optional: if its keys aren't set in Vercel it reports { connected: false }.
// Any platform can also be updated by hand (growth_manual table), e.g. Lemon8, which has no public API.
//
// Env (Vercel → Settings → Environment Variables):
//   GA_PROPERTY_ID, GA_CLIENT_EMAIL, GA_PRIVATE_KEY          Google Analytics 4 (service account, Viewer access)
//   BREVO_API_KEY, BREVO_LIST_ID (optional)                  Brevo email list
//   INSTAGRAM_USER_ID, INSTAGRAM_ACCESS_TOKEN                Instagram business account (Graph API)
//   YOUTUBE_API_KEY, YOUTUBE_CHANNEL_ID                      YouTube Data API
//   TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REFRESH_TOKEN   TikTok Display API

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
  const [total, recent] = await Promise.all([
    list ? getJSON(`https://api.brevo.com/v3/contacts/lists/${list}`, { headers }).then((d) => d.totalSubscribers ?? d.uniqueSubscribers ?? 0)
      : getJSON("https://api.brevo.com/v3/contacts?limit=1", { headers }).then((d) => d.count ?? 0),
    getJSON(`https://api.brevo.com/v3/contacts?limit=1&createdSince=${encodeURIComponent(since)}`, { headers }).then((d) => d.count ?? 0).catch(() => null),
  ]);
  return { connected: true, subscribers: total, new30: recent };
}

// ---- Social ----

export async function instagram() {
  const id = env("INSTAGRAM_USER_ID"), token = env("INSTAGRAM_ACCESS_TOKEN");
  if (!id || !token) return { connected: false };
  const d = await getJSON(`https://graph.facebook.com/v21.0/${id}?fields=followers_count,media_count,username&access_token=${encodeURIComponent(token)}`);
  return { connected: true, followers: d.followers_count ?? 0, posts: d.media_count ?? 0, handle: d.username ? `@${d.username}` : null };
}

export async function youtube() {
  const key = env("YOUTUBE_API_KEY"), channel = env("YOUTUBE_CHANNEL_ID");
  if (!key || !channel) return { connected: false };
  const d = await getJSON(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${encodeURIComponent(channel)}&key=${encodeURIComponent(key)}`);
  const s = d.items?.[0]?.statistics;
  if (!s) throw new Error("Channel not found. Check YOUTUBE_CHANNEL_ID.");
  return { connected: true, followers: Number(s.subscriberCount || 0), views: Number(s.viewCount || 0), posts: Number(s.videoCount || 0), handle: d.items[0].snippet?.customUrl || null };
}

export async function tiktok() {
  const clientKey = env("TIKTOK_CLIENT_KEY"), secret = env("TIKTOK_CLIENT_SECRET"), refresh = env("TIKTOK_REFRESH_TOKEN");
  if (!clientKey || !secret || !refresh) return { connected: false };
  const tok = await getJSON("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_key: clientKey, client_secret: secret, grant_type: "refresh_token", refresh_token: refresh }),
  });
  const d = await getJSON("https://open.tiktokapis.com/v2/user/info/?fields=follower_count,likes_count,video_count,display_name", {
    headers: { authorization: `Bearer ${tok.access_token}` },
  });
  const u = d.data?.user || {};
  return { connected: true, followers: u.follower_count ?? 0, likes: u.likes_count ?? 0, posts: u.video_count ?? 0, handle: u.display_name || null };
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
    social[p].manual = { followers: rows[0].followers, previous: rows[1]?.followers ?? null, on: rows[0].recorded_on, by: rows[0].recorded_by };
  }
  return { website: ga, email, social, manualReady: !!manual };
}
