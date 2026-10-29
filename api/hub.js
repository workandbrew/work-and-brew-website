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

import { readBody, db, loadScouts, publicScout, deliver, last4, twilioCancel, GROUP_LABELS, MAX_MESSAGE_CHARS } from "./_lib/sms.js";
import { listSchedules, saveSchedule, updateSchedule, approveSignup, rejectSignup, WEEKDAYS } from "./_lib/automation.js";
import { growthSnapshot, saveManual, tiktokReady, brevo } from "./_lib/growth.js";
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
const SCOUT_API_URL = process.env.SCOUT_API_URL || "https://script.google.com/macros/s/AKfycbyWnK8CDeemB7TiWCc-4pcP5DIBPjdzQQI8dYmaUs1fZosN1TUJOVelETPqRwTfSpTJ/exec";
async function sheetCafes(token) {
  if (!token) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 9000);
  try {
    const r = await fetch(SCOUT_API_URL, { method: "POST", headers: { "content-type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "listCafes", token }), signal: ctrl.signal, redirect: "follow" });
    const json = await r.json();
    return json && json.ok && Array.isArray(json.cafes) ? json.cafes : null;
  } catch { return null; } finally { clearTimeout(t); }
}

// Café numbers in the shape the hub uses. Takes rows from the sheet or from Supabase.
const statusOf = (st) => (!st || st === "Unvisited" ? "Ready To Be Assigned" : st === "Needs Revisit" ? "Incomplete" : st);
function cafeParts(cafes) {
  const cafeCounts = cafes ? cafes.reduce((m, c) => ((m[statusOf(c.status)] = (m[statusOf(c.status)] || 0) + 1), m), {}) : null;
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
  const cafeWeek = cafes && cafes.some((c) => "submitted_at" in c) ? {
    added: cafes.filter((c) => recent(c.submitted_at)).length,
    assigned: cafes.filter((c) => recent(c.assigned_at)).length,
    scouted: cafes.filter((c) => recent(c.date_scouted)).length,
    official: cafes.filter((c) => recent(c.approved_at) && statusOf(c.status) === "Official Cafe Listing").length,
  } : null;
  return { cafes: cafeCounts, cafeList, cafeWeek };
}

// The slow half of the hub: live café numbers from the Google Sheet and social/website stats.
// The page asks for this after it has already drawn everything else.
async function slowExtras(token) {
  const [sheet, growth] = await Promise.all([
    sheetCafes(token),
    growthSnapshot().catch((e) => ({ error: e.message })),
  ]);
  const cafes = sheet || await optional(db().from("cafes").select("*").limit(2000), null);
  return { ...cafeParts(cafes), cafesFrom: sheet ? "sheet" : "saved", growth };
}

async function extras() {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const [templates, signups, pendingList, schedules, events, worksRows, replies] = await Promise.all([
    optional(db().from("sms_templates").select("id, name, body, created_by").order("created_at"), null),
    optional(db().from("signup_requests").select("status, created_at").gte("created_at", since), null),
    optional(db().from("signup_requests").select("id, name, phone, sms_consent, created_at").eq("status", "pending").order("created_at"), []),
    listSchedules().catch(() => null),
    optional(db().from("events").select("*").order("starts_at", { ascending: true, nullsFirst: false }).limit(300), null),
    optional(db().from("current_works").select("*"), null),
    optional(db().from("sms_replies").select("id, from_phone, contact_id, body, kind, received_at, read_at").order("received_at", { ascending: false }).limit(150), null),
  ]);
  // Always the four departments, in order, even before anyone has written anything.
  const works = DEPARTMENTS.map((department) => {
    const row = (worksRows || []).find((r) => r.department === department);
    return { department, body: row?.body || "", updatedBy: row?.updated_by || null, updatedAt: row?.updated_at || null };
  });
  const pending = await optional(
    db().from("signup_requests").select("id", { count: "exact", head: true }).eq("status", "pending").then((r) => ({ data: r.count, error: r.error })), 0);
  return {
    templates: templates && templates.length ? templates : DEFAULT_TEMPLATES,
    templatesSaved: !!templates,
    signups: signups ? { last30: signups.length, approved30: signups.filter((r) => r.status === "approved").length, pending } : null,
    pendingSignups: pendingList.map(({ phone, ...r }) => ({ ...r, phoneLast4: last4(phone) })),
    schedules: schedules && schedules.map((s) => ({ ...s, weekdayName: WEEKDAYS[s.weekday] })),
    events,
    works,
    worksSaved: !!worksRows,
    replies,
  };
}

// --- Notifications (the bell) -----------------------------------------------------------------
// Everything that happened around the hub in the last 14 days, newest first. Built from the data the hub
// already keeps, so nothing extra has to be written when something changes.
const nyDate = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const nyStartOfDay = (date) => { // midnight New York time for a YYYY-MM-DD date, as ISO
  const guess = new Date(`${date}T05:00:00Z`);
  const hour = Number(guess.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hourCycle: "h23" }));
  return new Date(guess.getTime() - hour * 3600e3).toISOString();
};
const senderName = (from) => (from === "gwen" ? "Den (via Gwen)" : String(from || "someone").replace(/^Team Hub · /, "").replace(/^Scheduled · /, "Scheduled text: "));
const snippet = (t, n = 70) => { const s = String(t || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

async function notifications() {
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const today = nyDate(Date.now()), tomorrow = nyDate(Date.now() + 864e5);
  const tomorrowDay = WEEKDAYS.indexOf(new Date(`${tomorrow}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }));
  const [works, events, signups, replies, logData, schedules, oneOffs, people, email] = await Promise.all([
    optional(db().from("current_works").select("department, updated_by, updated_at").gte("updated_at", since), []),
    optional(db().from("events").select("id, title, created_by, created_at, starts_at").gte("created_at", since), []),
    optional(db().from("signup_requests").select("id, name, created_at").gte("created_at", since), []),
    optional(db().from("sms_replies").select("id, contact_id, from_phone, body, kind, received_at").gte("received_at", since).order("received_at", { ascending: false }).limit(60), []),
    recentLog().catch(() => ({ log: [] })),
    listSchedules().catch(() => []),
    optional(db().from("sms_messages").select("body, scheduled_for").eq("status", "scheduled").gte("scheduled_for", nyStartOfDay(tomorrow)).lt("scheduled_for", nyStartOfDay(nyDate(Date.now() + 2 * 864e5))), []),
    optional(db().from("sms_contacts").select("id, name, phone"), []),
    brevo().catch(() => null),
  ]);
  const items = [];
  const add = (kind, text, at, link) => at && items.push({ id: `${kind}-${at}-${items.length}`, kind, text, at, link });

  // Announcements: one item per save (rows saved together within 10 minutes by the same person)
  const sorted = [...works].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  for (const w of sorted) {
    const last = items.find((i) => i.kind === "announcement" && i.by === (w.updated_by || "") && Math.abs(new Date(i.at) - new Date(w.updated_at)) < 600e3);
    if (last) { last.depts.push(w.department); last.text = `${last.by || "Someone"} updated Team Lead Announcements · ${last.depts.join(", ")}`; continue; }
    add("announcement", `${w.updated_by || "Someone"} updated Team Lead Announcements · ${w.department}`, w.updated_at, "/team");
    Object.assign(items[items.length - 1], { by: w.updated_by || "", depts: [w.department] });
  }
  // Texts that went out
  for (const b of (logData.log || []).filter((b) => b.at >= since).slice(0, 30)) {
    const n = b.recipients.length;
    const whom = n === 1 ? b.recipients[0].name : `${n} people`;
    const sendTime = b.scheduledFor ? new Date(b.scheduledFor).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) : "";
    const text = b.state === "scheduled" ? `${senderName(b.from)} scheduled a text to ${whom} for ${sendTime}: “${snippet(b.body, 50)}”`
      : b.state === "canceled" ? `Scheduled text to ${whom} was canceled: “${snippet(b.body, 50)}”`
      : `${senderName(b.from)} texted ${whom}: “${snippet(b.body, 60)}”${b.failed ? ` · ${b.failed} failed` : ""}`;
    add(b.state === "scheduled" ? "scheduled" : "text", text, b.at, "/team/messages?tab=log");
  }
  // Going out tomorrow: weekly texts and one-off scheduled texts
  for (const s of schedules.filter((s) => s.active && s.weekday === tomorrowDay && (!s.ends_on || s.ends_on >= tomorrow))) {
    add("scheduled", `“${s.name}” goes out tomorrow morning to ${s.recipients.length > 1 ? `${s.recipients.length} groups` : s.recipients[0] === "all" ? "everyone" : s.recipients[0].replace(/^group:/, "")}`, nyStartOfDay(today), "/team/messages?tab=schedules");
  }
  const oneOffGroups = new Map();
  for (const m of oneOffs) { const k = m.scheduled_for + "|" + m.body; oneOffGroups.set(k, { ...m, count: (oneOffGroups.get(k)?.count || 0) + 1 }); }
  for (const m of oneOffGroups.values()) {
    const t = new Date(m.scheduled_for).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
    add("scheduled", `A text to ${m.count} ${m.count === 1 ? "person" : "people"} is scheduled for tomorrow at ${t}: “${snippet(m.body, 50)}”`, nyStartOfDay(today), "/team/messages?tab=log");
  }
  // Sign-ups
  for (const s of signups) add("signup", `New team sign-up: ${s.name}`, s.created_at, "/team/messages?tab=signups");
  if (email?.connected && email.new24) add("email", `${email.new24} new email sign-up${email.new24 > 1 ? "s" : ""} in the last 24 hours`, nyStartOfDay(today), "/team/growth");
  // Events
  for (const e of events) add("event", `Event added: ${e.title}${e.created_by ? ` · by ${String(e.created_by).split(" ")[0]}` : ""}`, e.created_at, "/team/events");
  // Replies
  const names = new Map(people.map((p) => [p.id, p.name])), byPhone = new Map(people.filter((p) => p.phone).map((p) => [p.phone, p.name]));
  for (const r of replies) {
    const who = names.get(r.contact_id) || byPhone.get(r.from_phone) || `•••• ${last4(r.from_phone)}`;
    add("reply", r.kind === "stop" ? `${who} replied STOP and is now opted out` : `Reply from ${who}: “${snippet(r.body, 60)}”`, r.received_at, "/team/messages?tab=replies");
  }
  for (const i of items) { delete i.by; delete i.depts; } // bookkeeping for grouping announcements
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 50);
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
  const nowIso = new Date().toISOString();
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
      batches.set(key, { id: key, at: r.created_at, from: r.sent_by || "unknown", body: r.body, recipients: [], scheduledFor: null });
    }
    const b = batches.get(key);
    if (r.scheduled_for && !b.scheduledFor) b.scheduledFor = r.scheduled_for;
    b.recipients.push({
      name: names.get(r.scout_id) || "Removed contact",
      ok: r.status !== "failed" && r.status !== "canceled",
      state: r.status === "canceled" ? "canceled" : r.status === "failed" ? "failed" : r.status === "scheduled" && r.scheduled_for > nowIso ? "scheduled" : "sent",
      error: r.error || null,
    });
  }
  const log = [...batches.values()].slice(0, 60).map((b) => ({
    ...b,
    sent: b.recipients.filter((x) => x.ok).length,
    failed: b.recipients.filter((x) => x.state === "failed").length,
    // "scheduled" = Twilio is still holding it; "canceled" = called off before it went out
    state: b.recipients.some((x) => x.state === "scheduled") ? "scheduled" : b.recipients.every((x) => x.state === "canceled") ? "canceled" : "sent",
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
  const nowIso = new Date().toISOString();
  for (const r of rows) {
    if (r.status === "canceled" || (r.status === "scheduled" && r.scheduled_for > nowIso)) continue; // not sent (yet)
    const day = out.get(nyDay(r.scheduled_for || r.created_at));
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
      if (req.query?.more) return res.status(200).json({ ok: true, ...(await slowExtras(bearer)) });
      if (req.query?.notifications) return res.status(200).json({ ok: true, items: await notifications() });
      const [scouts, { log, daily, prevSent30 }, more] = await Promise.all([loadScouts(), recentLog(), extras()]);
      const team = scouts.map((s) => ({ ...publicScout(s), optedOut: !!s.opted_out_at, optedIn: !!s.sms_opt_in }));
      const chapters = [...new Set(team.flatMap((s) => s.chapters))].sort();
      const groups = Object.entries(GROUP_LABELS)
        .map(([key, label]) => ({ key, label, count: team.filter((p) => p.group === key || p.alsoGroups.includes(key)).length }))
        .filter((g) => g.count);
      const sent30 = daily.reduce((n, d) => n + d.sent, 0);
      const failed30 = daily.reduce((n, d) => n + d.failed, 0);
      if (more.replies) {
        const byId = new Map(scouts.map((s) => [s.id, s])), byPhone = new Map(scouts.filter((s) => s.phone).map((s) => [s.phone, s]));
        more.replies = more.replies.map(({ from_phone, ...r }) => {
          const who = byId.get(r.contact_id) || byPhone.get(from_phone);
          return { ...r, contactId: who?.id || null, name: who?.name || null, phoneLast4: last4(from_phone), canReply: !!who && !who.opted_out_at && !!who.sms_opt_in };
        });
      }
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
    if (action === "schedule-save") return reply(await saveSchedule({ name, body, recipients: to, weekday: extra.weekday, createdBy: by, endsOn: extra.endsOn }));
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
    if (action === "scheduled-cancel") {
      const { data: rows, error } = await db().from("sms_messages").select("id, twilio_sid").eq("batch_id", String(id || "")).eq("status", "scheduled");
      if (error) return reply({ status: 500, error: error.message });
      let canceled = 0; const problems = [];
      for (const m of rows || []) {
        const r = m.twilio_sid ? await twilioCancel(m.twilio_sid).catch((e) => ({ ok: false, error: e.message })) : { ok: false, error: "no Twilio id" };
        if (r.ok) { canceled++; await db().from("sms_messages").update({ status: "canceled" }).eq("id", m.id); } else problems.push(r.error);
      }
      return reply(problems.length && !canceled ? { status: 502, error: `Couldn't cancel: ${problems[0]}` } : { canceled, notCanceled: problems.length });
    }
    if (action === "contact-also") {
      // e.g. a lead who should also get every Café scouts text
      const groups = (Array.isArray(extra.alsoGroups) ? extra.alsoGroups : []).map(String).filter((g) => g in GROUP_LABELS);
      const { error } = await db().from("sms_contacts").update({ also_groups: groups }).eq("id", String(id || ""));
      if (error && /also_groups/.test(error.message)) return reply({ status: 500, error: "This needs one database update first: run the also_groups line from supabase/sms.sql in Supabase." });
      return reply(error ? { status: 500, error: error.message } : {});
    }
    if (action === "replies-read") {
      let q = db().from("sms_replies").update({ read_at: new Date().toISOString(), read_by: by }).is("read_at", null);
      if (id) q = q.eq("id", String(id));
      const { error } = await q;
      return reply(error ? { status: 500, error: error.message } : {});
    }
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
      sendAt: extra.sendAt || undefined, // one-off scheduled text: Twilio holds it until then (15 min to 7 days out)
    });
    res.status(status).json(json);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
