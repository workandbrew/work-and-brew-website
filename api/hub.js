// /api/hub — the server side of the private Team Hub page (/team).
//
// Only logged-in website users whose email is in the Supabase `hub_admins` table get in
// (Den, David, Armando, Sayraliz). The browser sends its Supabase login token:
//   Authorization: Bearer <supabase access token>
//
//   GET ?access=1                               → { map, hub }: which team links this user sees in the navbar
//   GET                                         → { me, team, chapters, groups, log, templates, signups, cafes, ... }
//   POST { action: "preview", to, message }     → who would get it + the exact text (sends nothing)
//   POST { action: "send",    to, message }     → sends, logged with the sender's name
//   POST { action: "template-save", name, body } → saves a reusable message
//   POST { action: "template-delete", id }       → removes one
//   POST { action: "schedule-save", name, body, to, weekday }  → a weekly text (sent by /api/cron)
//   POST { action: "schedule-toggle" | "schedule-delete", id }
//   POST { action: "signup-approve", id, chapters, role } / { action: "signup-reject", id }
//   POST { action: "growth-manual", platform, followers }        → hand-entered follower count
//   POST { action: "tiktok-connect" }                            → a one-time link to connect TikTok
//
// Sending goes through the same deliver() as Gwen, so the same rules apply: only active,
// opted-in team members, STOP line always added, max 25 recipients per send.

import { readBody, db, loadScouts, publicScout, deliver, last4, GROUP_LABELS, MAX_MESSAGE_CHARS } from "./_lib/sms.js";
import { listSchedules, saveSchedule, updateSchedule, approveSignup, rejectSignup, WEEKDAYS } from "./_lib/automation.js";
import { growthSnapshot, saveManual, tiktokReady } from "./_lib/growth.js";
import { makeState } from "./_lib/connectState.js";

// Starter templates shown until the team saves its own (the sms_templates table may not exist yet).
const DEFAULT_TEMPLATES = [
  { id: "default-monday", name: "Monday assignments", body: "Hi {first name}! Your cafés for this week are up on the scout map. Due Friday. Thanks for all the great finds!" },
  { id: "default-checkin", name: "Mid-week check-in", body: "Hi {first name}, quick check-in: how are your café visits going this week? Reply if you need help." },
  { id: "default-friday", name: "Due today + shoutout", body: "Hi {first name}! Café visits are due today. Shoutout to everyone who logged visits this week!" },
  { id: "default-welcome", name: "Welcome new scout", body: "Welcome to Work & Brew, {first name}! Your first café is on the scout map. We're glad you're here." },
];

// Optional tables: if one isn't set up yet, the hub still loads and shows an empty state.
async function optional(query, fallback) {
  try { const { data, error } = await query; return error ? fallback : data ?? fallback; } catch { return fallback; }
}

// The scout map's Apps Script. It checks the caller's own login token, so the hub just forwards it.
const SCOUT_API_URL = process.env.SCOUT_API_URL || "https://script.google.com/macros/s/AKfycbza5uMWpynLQzkdY5BGVSp9PNiaPT6nWR7vGiBfhUOFJgLcIRnIHW2YxAHfzMpZSEM8/exec";
async function sheetCafes(token) {
  if (!token) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 7000);
  try {
    const r = await fetch(SCOUT_API_URL, { method: "POST", headers: { "content-type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "listCafes", token }), signal: ctrl.signal, redirect: "follow" });
    const json = await r.json();
    return json && json.ok && Array.isArray(json.cafes) ? json.cafes : null;
  } catch { return null; } finally { clearTimeout(t); }
}

async function extras(token) {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const [templates, signups, cafes, pendingList, schedules, growth, events, worksRows] = await Promise.all([
    optional(db().from("sms_templates").select("id, name, body, created_by").order("created_at"), null),
    optional(db().from("signup_requests").select("status, created_at").gte("created_at", since), null),
    sheetCafes(token).then((rows) => rows || optional(db().from("cafes").select("*").limit(2000), null)),
    optional(db().from("signup_requests").select("id, name, phone, sms_consent, created_at").eq("status", "pending").order("created_at"), []),
    listSchedules().catch(() => null),
    growthSnapshot().catch((e) => ({ error: e.message })),
    optional(db().from("events").select("*").order("starts_at", { ascending: true, nullsFirst: false }).limit(300), null),
    optional(db().from("current_works").select("*"), null),
  ]);
  // Always the four departments, in order, even before anyone has written anything.
  const works = DEPARTMENTS.map((department) => {
    const row = (worksRows || []).find((r) => r.department === department);
    return { department, body: row?.body || "", updatedBy: row?.updated_by || null, updatedAt: row?.updated_at || null };
  });
  const pending = await optional(
    db().from("signup_requests").select("id", { count: "exact", head: true }).eq("status", "pending").then((r) => ({ data: r.count, error: r.error })), 0);
  // Same names as the spreadsheet (older rows may still say Unvisited or Needs Revisit).
  const statusOf = (st) => (!st || st === "Unvisited" ? "Ready To Be Assigned" : st === "Needs Revisit" ? "Incomplete" : st);
  const cafeCounts = cafes ? cafes.reduce((m, c) => ((m[statusOf(c.status)] = (m[statusOf(c.status)] || 0) + 1), m), {}) : null;
  // A compact café list for the Cafés page (the table has more columns than the hub needs).
  const yes = (v) => (v == null || v === "" ? null : /^(true|yes|y|1)$/i.test(String(v)) ? "Yes" : /^(false|no|n|0)$/i.test(String(v)) ? "No" : String(v));
  const cafeList = cafes ? cafes.map((c) => ({
    id: c.id, number: c.number ?? c.cafe_number ?? null, name: c.name || "Unnamed café", borough: c.borough || "", status: statusOf(c.status),
    assignedTo: c.assigned_to || null, scout: c.scout_name || null,
    wifi: yes(c.wifi), outlets: yes(c.outlets), seats: c.seats || null,
    at: c.updated_at || c.visited_at || null,
  })) : null;
  // What happened in the last 7 days, from the dates the sheet keeps on each café
  const weekAgo = Date.now() - 7 * 864e5;
  const recent = (iso) => !!iso && new Date(iso).getTime() >= weekAgo;
  const week = cafes && cafes.some((c) => "submitted_at" in c) ? {
    added: cafes.filter((c) => recent(c.submitted_at)).length,
    assigned: cafes.filter((c) => recent(c.assigned_at)).length,
    scouted: cafes.filter((c) => recent(c.date_scouted)).length,
    official: cafes.filter((c) => recent(c.approved_at) && statusOf(c.status) === "Official Cafe Listing").length,
  } : null;
  return {
    templates: templates && templates.length ? templates : DEFAULT_TEMPLATES,
    templatesSaved: !!templates,
    signups: signups ? { last30: signups.length, approved30: signups.filter((r) => r.status === "approved").length, pending } : null,
    cafes: cafeCounts,
    cafeList,
    cafeWeek: week,
    pendingSignups: pendingList.map(({ phone, ...r }) => ({ ...r, phoneLast4: last4(phone) })),
    schedules: schedules && schedules.map((s) => ({ ...s, weekdayName: WEEKDAYS[s.weekday] })),
    growth,
    events,
    works,
    worksSaved: !!worksRows,
  };
}

// --- Current works (overview) ----------------------------------------------------------------
const DEPARTMENTS = ["B2B & Marketing", "Café Scouting", "App & Web Development", "UI/UX Design"];
// The founder keeps this board; anyone whose hub_admins role says Founder/Owner/CEO can edit,
// as can the email in HUB_OWNER_EMAIL (Vercel env), if set.
const canEditWorks = (me) => /founder|owner|ceo/i.test(me.role || "") || (!!process.env.HUB_OWNER_EMAIL && me.email?.toLowerCase() === process.env.HUB_OWNER_EMAIL.toLowerCase());

async function saveWorks(me, extra) {
  if (!canEditWorks(me)) return { status: 403, error: "Only the founder can update Current works." };
  const department = DEPARTMENTS.find((d) => d === extra.department);
  if (!department) return { status: 400, error: "Unknown department." };
  const body = String(extra.body || "").trim().slice(0, 600);
  const { error } = await db().from("current_works").upsert({ department, body, updated_by: me.name || me.email, updated_at: new Date().toISOString() });
  if (error) return { status: 500, error: `Couldn't save (${error.message}). Has the current_works table in supabase/sms.sql been created?` };
  return {};
}

// --- Events -----------------------------------------------------------------------------------
const EVENT_STATUSES = ["idea", "planning", "confirmed", "done", "cancelled"];
const cleanChecklist = (list) => (Array.isArray(list) ? list : [])
  .map((i) => ({ text: String(i?.text || "").trim().slice(0, 160), done: !!i?.done }))
  .filter((i) => i.text).slice(0, 40);

async function saveEvent(id, extra, by) {
  const title = String(extra.title || "").trim().slice(0, 120);
  if (!title) return { status: 400, error: "Give the event a name." };
  const starts = extra.startsAt ? new Date(extra.startsAt) : null;
  if (starts && Number.isNaN(starts.getTime())) return { status: 400, error: "That date doesn't look right." };
  const row = {
    title,
    starts_at: starts ? starts.toISOString() : null,
    venue: String(extra.venue || "").trim().slice(0, 200) || null,
    host: String(extra.host || "").trim().slice(0, 80) || null,
    status: EVENT_STATUSES.includes(extra.status) ? extra.status : "idea",
    headcount_target: extra.headcount === "" || extra.headcount == null ? null : Math.max(0, parseInt(extra.headcount, 10) || 0),
    notes: String(extra.notes || "").trim().slice(0, 2000) || null,
    updated_at: new Date().toISOString(),
  };
  if (extra.checklist !== undefined) row.checklist = cleanChecklist(extra.checklist);
  const q = id
    ? db().from("events").update(row).eq("id", String(id)).select("*").single()
    : db().from("events").insert({ ...row, checklist: row.checklist || [], created_by: by }).select("*").single();
  const { data, error } = await q;
  if (error) return { status: 500, error: `Couldn't save (${error.message}). Has the events table in supabase/sms.sql been created?` };
  return { event: data };
}

// Toggle one checklist item (index), or replace the whole list when `checklist` is sent.
async function checkEvent(id, extra) {
  if (!id) return { status: 400, error: "Missing event." };
  let next;
  if (extra.checklist !== undefined) next = cleanChecklist(extra.checklist);
  else {
    const { data, error } = await db().from("events").select("checklist").eq("id", id).single();
    if (error) return { status: 404, error: "Event not found." };
    next = cleanChecklist(data.checklist);
    const i = Number(extra.index);
    if (!next[i]) return { status: 400, error: "That checklist item is gone." };
    next[i].done = extra.done === undefined ? !next[i].done : !!extra.done;
  }
  const { data, error } = await db().from("events").update({ checklist: next, updated_at: new Date().toISOString() }).eq("id", id).select("*").single();
  if (error) return { status: 500, error: error.message };
  return { event: data };
}

// Which team-only links a logged-in website user should see in the top navigation.
// Café Map: everyone in team_access (plus hub admins). Team Hub: hub_admins only.
async function navAccess(req) {
  const header = req.headers?.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { map: false, hub: false };
  const { data } = await db().auth.getUser(token);
  const email = data?.user?.email?.toLowerCase();
  if (!email) return { map: false, hub: false };
  const [admin, member] = await Promise.all([
    optional(db().from("hub_admins").select("email").ilike("email", email).maybeSingle(), null),
    optional(db().from("team_access").select("email").ilike("email", email).maybeSingle(), null),
  ]);
  return { hub: !!admin, map: !!admin || !!member };
}

async function hubUser(req) {
  const header = req.headers?.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return { status: 401, error: "Please log in." };
  const { data, error } = await db().auth.getUser(token);
  const email = data?.user?.email?.toLowerCase();
  if (error || !email) return { status: 401, error: "Your login expired. Please log in again." };
  const { data: admin, error: adminErr } = await db()
    .from("hub_admins").select("email, name, role").ilike("email", email).maybeSingle();
  if (adminErr) return { status: 500, error: `Team Hub isn't set up yet (${adminErr.message})` };
  if (!admin) return { status: 403, error: "The Team Hub is for department heads only." };
  return { admin };
}

// Groups log rows from one send (same batch) into a single entry, newest first.
async function recentLog() {
  const [{ data: rows, error }, { data: people }] = await Promise.all([
    db().from("sms_messages").select("*").order("created_at", { ascending: false }).limit(400),
    db().from("sms_contacts").select("id, name"),
  ]);
  if (error) throw new Error(error.message);
  const names = new Map((people || []).map((p) => [p.id, p.name]));
  const batches = new Map();
  for (const r of rows || []) {
    const key = r.batch_id || r.id;
    if (!batches.has(key)) {
      batches.set(key, { id: key, at: r.created_at, from: r.sent_by || "unknown", body: r.body, recipients: [] });
    }
    batches.get(key).recipients.push({
      name: names.get(r.scout_id) || "Removed contact",
      ok: r.status !== "failed",
      error: r.error || null,
    });
  }
  const log = [...batches.values()].slice(0, 60).map((b) => ({
    ...b,
    sent: b.recipients.filter((x) => x.ok).length,
    failed: b.recipients.filter((x) => !x.ok).length,
  }));
  const days = dailyCounts(rows || [], 60);
  return { log, daily: days.slice(30), prevSent30: days.slice(0, 30).reduce((n, d) => n + d.sent, 0) };
}

// "Good morning" + "Friday, October 9" in New York time, for the hub's welcome banner.
function welcome() {
  const now = new Date();
  const hour = Number(now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = now.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric" });
  return { greeting, today };
}

// Texts per day (New York time) for the last 30 days, oldest first — feeds the Team Hub chart.
const nyDay = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
function dailyCounts(rows, days = 30) {
  const out = new Map();
  for (let i = days - 1; i >= 0; i--) out.set(nyDay(Date.now() - i * 864e5), { date: "", sent: 0, failed: 0 });
  for (const [k, v] of out) v.date = k;
  for (const r of rows) {
    const day = out.get(nyDay(r.created_at));
    if (day) day[r.status === "failed" ? "failed" : "sent"]++;
  }
  return [...out.values()];
}

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "GET/POST only" });
  }
  if (req.method === "GET" && req.query?.access) {
    try { return res.status(200).json({ ok: true, ...(await navAccess(req)) }); }
    catch { return res.status(200).json({ ok: true, map: false, hub: false }); }
  }
  let who;
  try { who = await hubUser(req); } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
  if (!who.admin) return res.status(who.status).json({ ok: false, error: who.error });
  const me = who.admin;

  try {
    if (req.method === "GET") {
      const bearer = String(req.headers?.authorization || "").replace(/^Bearer /, "");
      const [scouts, { log, daily, prevSent30 }, more] = await Promise.all([loadScouts(), recentLog(), extras(bearer)]);
      const team = scouts.map((s) => ({ ...publicScout(s), optedOut: !!s.opted_out_at, optedIn: !!s.sms_opt_in }));
      const chapters = [...new Set(team.flatMap((s) => s.chapters))].sort();
      const groups = Object.entries(GROUP_LABELS)
        .map(([key, label]) => ({ key, label, count: team.filter((p) => p.group === key).length }))
        .filter((g) => g.count);
      const sent30 = daily.reduce((n, d) => n + d.sent, 0);
      const failed30 = daily.reduce((n, d) => n + d.failed, 0);
      return res.status(200).json({ ok: true, me: { ...me, canEditWorks: canEditWorks(me) }, ...welcome(), team, chapters, groups, log, daily, stats: { sent30, failed30, prevSent30 }, ...more });
    }

    const { action, to, message, name, body, id } = readBody(req);
    if (action === "template-save") {
      const n = String(name || "").trim().slice(0, 60);
      const b = String(body || "").trim();
      if (!n || !b) return res.status(400).json({ ok: false, error: "A template needs a name and a message." });
      if (b.length > MAX_MESSAGE_CHARS) return res.status(400).json({ ok: false, error: `Keep it under ${MAX_MESSAGE_CHARS} characters.` });
      const { error } = await db().from("sms_templates").insert({ name: n, body: b, created_by: me.name || me.email });
      if (error) return res.status(500).json({ ok: false, error: `Couldn't save (${error.message}). Has supabase/sms.sql been run?` });
      return res.status(200).json({ ok: true });
    }
    const reply = (r) => res.status(r.status || 200).json(r.error ? { ok: false, error: r.error } : { ok: true, ...r });
    const by = me.name || me.email;
    const extra = readBody(req);
    if (action === "schedule-save") return reply(await saveSchedule({ name, body, recipients: to, weekday: extra.weekday, createdBy: by }));
    if (action === "schedule-toggle") { await updateSchedule(String(id), { active: !!extra.active }); return reply({}); }
    if (action === "schedule-delete") { await updateSchedule(String(id), null); return reply({}); }
    if (action === "signup-approve") {
      const r = await approveSignup(String(id), { chapters: extra.chapters, role: extra.role });
      return reply(r.error ? r : { scout: r.scout, welcome: r.welcome });
    }
    if (action === "signup-reject") return reply(await rejectSignup(String(id)));
    if (action === "tiktok-connect") {
      if (!tiktokReady()) return reply({ status: 400, error: "Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in Vercel first." });
      return reply({ url: `/api/connect?start=${encodeURIComponent(makeState())}` });
    }
    if (action === "growth-manual") return reply(await saveManual(extra.platform, extra.followers, by));
    if (action === "works-save") return reply(await saveWorks(me, extra));
    if (action === "event-save") return reply(await saveEvent(id, extra, by));
    if (action === "event-check") return reply(await checkEvent(String(id || ""), extra));
    if (action === "event-delete") {
      const { error } = await db().from("events").delete().eq("id", String(id || ""));
      return reply(error ? { status: 500, error: error.message } : {});
    }
    if (action === "template-edit") {
      const n = String(name || "").trim().slice(0, 60);
      const b = String(body || "").trim();
      if (!n || !b) return res.status(400).json({ ok: false, error: "A template needs a name and a message." });
      if (b.length > MAX_MESSAGE_CHARS) return res.status(400).json({ ok: false, error: `Keep it under ${MAX_MESSAGE_CHARS} characters.` });
      const { error } = await db().from("sms_templates").update({ name: n, body: b }).eq("id", String(id || ""));
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true });
    }
    if (action === "template-delete") {
      const { error } = await db().from("sms_templates").delete().eq("id", String(id || ""));
      if (error) return res.status(500).json({ ok: false, error: error.message });
      return res.status(200).json({ ok: true });
    }
    if (!["preview", "send"].includes(action)) {
      return res.status(400).json({ ok: false, error: 'action must be "preview" or "send"' });
    }
    const { status, json } = await deliver({
      to, message, dryRun: action === "preview", sentBy: `Team Hub · ${me.name || me.email}`,
    });
    res.status(status).json(json);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
