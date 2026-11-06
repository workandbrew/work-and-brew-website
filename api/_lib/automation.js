// Scheduled weekly texts, the new-scout welcome series and sign-up approval.
// Used by /api/hub (department heads), /api/signups (Gwen & co) and /api/cron (daily run).

import { db, deliver } from "./sms.js";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Day 0 goes out the moment a sign-up is approved; days 1 and 7 go out on the daily run.
export const WELCOME_SERIES = [
  { day: 0, body: "Welcome to the Work & Brew team, {first name}! We're so glad you're here. Your first café will be on the scout map soon." },
  { day: 1, body: "Hi {first name}! Your first café is ready on the scout map. Visit when you can and log Wi-Fi, outlets, seating and noise." },
  { day: 7, body: "Hi {first name}, you've been on the team a week! How's scouting going? Reply anytime if you need help." },
];

// "2026-10-19" and 0-6 (Sunday = 0) in New York time.
export function nyToday(now = new Date()) {
  const date = now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const weekday = WEEKDAYS.indexOf(now.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long" }));
  return { date, weekday };
}

const daysSince = (iso, now = Date.now()) => Math.floor((now - new Date(iso).getTime()) / 864e5);

// ---- sign-up approval ----

// Copies a pending sign-up (and its consent record) onto the team, then starts the welcome series.
export async function approveSignup(id, { chapters, role } = {}) {
  const { data: request, error: readErr } = await db()
    .from("signup_requests").select("*").eq("id", id).eq("status", "pending").maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!request) return { status: 404, error: "No pending request with that id" };

  const row = {
    name: request.name,
    phone: request.phone,
    role: role || "Cafe Scout",
    chapters: Array.isArray(chapters) ? chapters.map(String) : [],
    sms_opt_in: request.sms_consent,
    consent_at: request.consent_at,
    consent_text: request.consent_text,
    consent_source: "scout-signup form",
    signup_request_id: request.id,
    active: true,
    opted_out_at: null,
  };
  // Someone re-signing up with a number already on the team updates their row instead.
  const write = request.phone
    ? db().from("sms_contacts").upsert(row, { onConflict: "phone" })
    : db().from("sms_contacts").insert(row);
  const { data: scout, error } = await write.select("id, name, chapters, sms_opt_in").single();
  if (error) throw new Error(error.message);

  const { error: updErr } = await db().from("signup_requests")
    .update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", id);
  if (updErr) throw new Error(updErr.message);

  const welcome = scout.sms_opt_in ? await startWelcome(scout.id) : { sent: false, reason: "no text consent" };
  return { status: 200, scout, welcome };
}

export async function rejectSignup(id) {
  const { data, error } = await db().from("signup_requests")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", id).eq("status", "pending").select("id");
  if (error) throw new Error(error.message);
  return data?.length ? { status: 200 } : { status: 404, error: "No pending request with that id" };
}

// ---- welcome series ----

async function startWelcome(contactId) {
  const r = await deliver({ to: [contactId], message: WELCOME_SERIES[0].body, sentBy: "Welcome series" });
  // Mark the series started even if the text failed, so the daily run doesn't double up.
  await db().from("sms_contacts")
    .update({ welcome_started_at: new Date().toISOString(), welcome_step: 1 }).eq("id", contactId);
  return { sent: !!r.json.sent, error: r.json.sent ? null : r.json.error };
}

export async function runWelcomeSeries(now = Date.now()) {
  const { data, error } = await db().from("sms_contacts")
    .select("id, name, welcome_started_at, welcome_step")
    .eq("active", true).not("welcome_started_at", "is", null).lt("welcome_step", WELCOME_SERIES.length);
  if (error) throw new Error(`welcome: ${error.message}`);
  const out = [];
  for (const c of data || []) {
    const step = WELCOME_SERIES[c.welcome_step];
    if (!step || daysSince(c.welcome_started_at, now) < step.day) continue;
    const r = await deliver({ to: [c.id], message: step.body, sentBy: "Welcome series" });
    await db().from("sms_contacts").update({ welcome_step: c.welcome_step + 1 }).eq("id", c.id);
    out.push({ name: c.name, day: step.day, sent: r.json.sent || 0, error: r.json.sent ? null : r.json.error });
  }
  return out;
}

// ---- scheduled weekly texts ----

export async function listSchedules() {
  const { data, error } = await db().from("sms_schedules")
    .select("*").order("weekday"); // "*" so this keeps working before and after the ends_on column exists
  if (error) throw new Error(error.message);
  return data || [];
}

export async function saveSchedule({ name, body, recipients, weekday, createdBy, endsOn }) {
  const day = Number(weekday);
  const until = endsOn ? String(endsOn).slice(0, 10) : null;
  if (until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) return { status: 400, error: "That end date doesn't look right." };
  if (until && until < nyToday().date) return { status: 400, error: "Pick an end date that's today or later." };
  if (!String(body || "").trim()) return { status: 400, error: "The scheduled text needs a message." };
  if (!Array.isArray(recipients) || !recipients.length) return { status: 400, error: "Pick who gets it." };
  if (!(day >= 0 && day <= 6)) return { status: 400, error: "Pick a day of the week." };
  const row = {
    name: String(name || "").trim().slice(0, 60) || `Every ${WEEKDAYS[day]}`,
    body: String(body).trim(), recipients: recipients.map(String), weekday: day, active: true, created_by: createdBy,
    ...(until ? { ends_on: until } : {}),
  };
  const { error } = await db().from("sms_schedules").insert(row);
  if (error && until && /ends_on/.test(error.message)) return { status: 500, error: "End dates need one database update first: run the ends_on line at the end of supabase/sms.sql in Supabase." };
  if (error) return { status: 500, error: `Couldn't save (${error.message}). Has supabase/sms.sql been run?` };
  return { status: 200 };
}

export async function updateSchedule(id, patch) {
  const { error } = patch === null
    ? await db().from("sms_schedules").delete().eq("id", id)
    : await db().from("sms_schedules").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

// Sends every active schedule for today's weekday that hasn't gone out today.
export async function runSchedules(now = new Date()) {
  const { date, weekday } = nyToday(now);
  const out = [];
  for (const s of await listSchedules()) {
    // Past its end date: pause it so it stops showing as active, and send nothing
    if (s.active && s.ends_on && date > s.ends_on) { await db().from("sms_schedules").update({ active: false }).eq("id", s.id); continue; }
    if (!s.active || s.weekday !== weekday || s.last_sent_on === date) continue;
    // Claim today's run first so a retry can never send the same text twice.
    const { data: claimed } = await db().from("sms_schedules")
      .update({ last_sent_on: date }).eq("id", s.id).or(`last_sent_on.is.null,last_sent_on.neq.${date}`).select("id");
    if (!claimed?.length) continue;
    const r = await deliver({ to: s.recipients, message: s.body, sentBy: `Scheduled · ${s.name}` });
    out.push({ name: s.name, sent: r.json.sent || 0, error: r.json.sent ? null : r.json.error });
  }
  return out;
}
