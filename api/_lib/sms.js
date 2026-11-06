// Shared server-side helpers for the Scout SMS endpoints (/api/send, /api/scouts, /api/signups).
// Files under api/_lib are not deployed as endpoints themselves.
//
// Env (Vercel → Settings → Environment Variables — never in git):
//   SMS_API_KEY                   bearer token every caller (Gwen, schedules, Shortcut) must send
//   SUPABASE_URL                  falls back to VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY     server-only key; bypasses RLS to read the scouts roster
//   TWILIO_ACCOUNT_SID
//   TWILIO_MESSAGING_SERVICE_SID
//   TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET   (or TWILIO_AUTH_TOKEN)

import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual, randomUUID } from "node:crypto";

export const MAX_RECIPIENTS = 25;    // per request — a guard against runaway sends/charges
export const MAX_MESSAGE_CHARS = 480; // ~3 SMS segments, before the STOP line
export const STOP_LINE = "Reply STOP to opt out.";

// ---- auth ----

// Fails closed: if SMS_API_KEY isn't configured, nothing is authorized.
export function isAuthorized(req, key = process.env.SMS_API_KEY) {
  if (!key) return false;
  const header = req.headers?.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(token);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Returns true if the request may proceed; otherwise writes the error response.
export function guard(req, res, methods) {
  if (!methods.includes(req.method)) {
    res.setHeader("Allow", methods.join(", "));
    res.status(405).json({ ok: false, error: `${methods.join("/")} only` });
    return false;
  }
  if (!process.env.SMS_API_KEY) {
    res.status(500).json({ ok: false, error: "SMS_API_KEY is not configured" });
    return false;
  }
  if (!isAuthorized(req)) {
    res.status(401).json({ ok: false, error: "unauthorized" });
    return false;
  }
  return true;
}

export function readBody(req) {
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body || {};
}

// ---- phone numbers + message body ----

// US-friendly E.164 normalizer: "(929) 471-8403" → "+19294718403". Returns null if unusable.
export function normalizePhone(input) {
  if (!input) return null;
  const raw = String(input).trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

// Every message carries the opt-out line (carrier/CTIA requirement).
export function withStopLine(message) {
  const body = String(message || "").trim();
  return /\bstop\b/i.test(body) ? body : `${body} ${STOP_LINE}`;
}

// The reverse of personalize + withStopLine: turns one person's logged text back into the editable message.
export function toTemplate(body, name) {
  let t = String(body || "").replace(STOP_LINE, "").trim();
  const first = String(name || "").trim().split(/\s+/)[0];
  if (first && first.length > 1) t = t.replace(new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), "{first name}");
  return t;
}

export function last4(phone) {
  return phone ? phone.slice(-4) : null;
}

// ---- recipient resolution ----

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Team groups come from each person's role: "Scout Lead", "Co-Founder", "B2B Manager" → leads;
// anything with "creator" → creators; everyone else → café scouts.
export function teamGroup(s) {
  const role = String(s.role || "").toLowerCase();
  if (role.includes("creator")) return "creators";
  if (/(lead|founder|manager|head|director|captain)/.test(role)) return "leads";
  return "scouts";
}
export const inGroup = (s, g) => teamGroup(s) === g || (Array.isArray(s.also_groups) && s.also_groups.includes(g));
export const GROUP_LABELS = { leads: "Leads", scouts: "Café scouts", creators: "Content creators" };

// "{first name}" in a message becomes each person's first name.
export function personalize(body, s) {
  const first = String(s?.name || "").trim().split(/\s+/)[0] || "there";
  return String(body).replace(/\{\s*first\s*name\s*\}/gi, first);
}

// Which scouts one `to` entry refers to. Order matters: id → phone → "all" → group → chapter → name.
function matchEntry(entry, scouts) {
  const q = String(entry || "").trim();
  if (!q) return [];
  if (UUID_RE.test(q)) return scouts.filter((s) => s.id === q);
  if (/^\+?[\d(][\d\s().-]{8,}$/.test(q)) {
    const phone = normalizePhone(q);
    return phone ? scouts.filter((s) => s.phone === phone) : [];
  }
  const lower = q.toLowerCase();
  if (lower === "all" || lower === "everyone") return scouts;
  // A group is everyone whose role puts them there, plus anyone added to it on purpose (e.g. leads who get scout texts)
  if (lower.startsWith("group:")) return scouts.filter((s) => inGroup(s, lower.slice(6)));
  const chapters = (s) => (s.chapters || []).map((c) => c.toLowerCase());
  // exact chapter ("Bronx", "Manhattan-UWS"), then chapter prefix ("Manhattan" → every Manhattan chapter)
  let hits = scouts.filter((s) => chapters(s).includes(lower));
  if (!hits.length) hits = scouts.filter((s) => chapters(s).some((c) => c.startsWith(lower)));
  if (!hits.length) hits = scouts.filter((s) => s.name.toLowerCase().includes(lower));
  return hits;
}

const canText = (s) => s.active !== false && s.sms_opt_in && !!s.phone && !s.opted_out_at;

// Resolves `to` (string or array) against the roster. Only scouts on the roster can ever be
// texted — a raw phone number that isn't a scout's is reported as unmatched, never sent to.
export function resolveRecipients(to, scouts) {
  const entries = (Array.isArray(to) ? to : [to]).map((e) => String(e || "").trim()).filter(Boolean);
  const active = scouts.filter((s) => s.active !== false);
  const unmatched = [];
  const seen = new Map();
  for (const entry of entries) {
    const hits = matchEntry(entry, active);
    if (!hits.length) unmatched.push(entry);
    for (const s of hits) seen.set(s.id, s);
  }
  const all = [...seen.values()];
  return {
    entries,
    unmatched,
    recipients: all.filter(canText),
    skipped: all.filter((s) => !canText(s)).map((s) => ({
      id: s.id,
      name: s.name,
      reason: s.opted_out_at ? "opted out (replied STOP)" : !s.phone ? "no phone number" : "has not opted in to texts",
    })),
  };
}

export function publicScout(s) {
  return {
    id: s.id,
    name: s.name,
    role: s.role,
    group: teamGroup(s),
    alsoGroups: Array.isArray(s.also_groups) ? s.also_groups : [],
    chapters: s.chapters || [],
    phoneLast4: last4(s.phone),
    canText: canText(s),
  };
}

// ---- Supabase (service role) ----

let _db;
export function db() {
  if (_db) return _db;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured");
  _db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _db;
}

export async function loadScouts() {
  const { data, error } = await db()
    .from("sms_contacts")
    .select("*") // "*" keeps working before and after newer optional columns (also_groups) exist
    .eq("active", true)
    .order("name");
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data || [];
}

// ---- Twilio ----

export async function twilioSend(to, body, sendAt) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const user = process.env.TWILIO_API_KEY_SID || accountSid;
  const pass = process.env.TWILIO_API_KEY_SECRET || process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !messagingServiceSid || !pass) {
    throw new Error("Twilio credentials are not configured");
  }
  // Scheduled send: a Messaging Service (which we use) + ScheduleType=fixed + SendAt tells Twilio
  // to hold the message and send it itself at that UTC time (15 min to 7 days out).
  const params = { To: to, MessagingServiceSid: messagingServiceSid, Body: body };
  if (sendAt) { params.ScheduleType = "fixed"; params.SendAt = sendAt; }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${user}:${pass}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok
    ? { ok: true, sid: data.sid, status: data.status }
    : { ok: false, code: data.code, error: data.message || `Twilio HTTP ${res.status}` };
}

// Twilio error 21610 = recipient replied STOP.
export const TWILIO_OPTED_OUT = 21610;

// Cancel a message Twilio is still holding for a scheduled send (status 'scheduled').
export async function twilioCancel(sid) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const user = process.env.TWILIO_API_KEY_SID || accountSid;
  const pass = process.env.TWILIO_API_KEY_SECRET || process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !pass) throw new Error("Twilio credentials are not configured");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${sid}.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${user}:${pass}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ Status: "canceled" }),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, status: data.status } : { ok: false, error: data.message || `Twilio HTTP ${res.status}` };
}

// What Twilio knows about one message now: queued → sent → delivered, or undelivered/failed with a code.
export async function twilioStatus(sid) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const user = process.env.TWILIO_API_KEY_SID || accountSid;
  const pass = process.env.TWILIO_API_KEY_SECRET || process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !pass) throw new Error("Twilio credentials are not configured");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${sid}.json`, {
    headers: { Authorization: "Basic " + Buffer.from(`${user}:${pass}`).toString("base64") },
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, status: data.status, code: data.error_code, error: data.error_message } : { ok: false, error: data.message || `Twilio HTTP ${res.status}` };
}

// Plain-English reasons for the carrier error codes we are most likely to see.
const DELIVERY_REASONS = {
  30003: "Phone unreachable (off or no signal).",
  30004: "Blocked by the person's phone or carrier settings.",
  30005: "That number doesn't exist anymore.",
  30006: "That number is a landline or can't get texts.",
  30007: "The carrier filtered it as spam.",
  30008: "The carrier didn't say why.",
  30032: "Blocked: the toll-free number isn't verified with Twilio yet.",
  30034: "Blocked: the Twilio number isn't registered for business texting (A2P 10DLC) yet.",
  21610: "This person replied STOP.",
};
export function deliveryReason(code, fallback) {
  return DELIVERY_REASONS[Number(code)] || (code ? `Twilio error ${code}${fallback ? `: ${fallback}` : ""}` : fallback || "Not delivered.");
}

// Statuses Twilio can still change: re-check those so the log shows what really reached people.
export const PENDING_STATUSES = ["queued", "accepted", "sending", "sent", "scheduled"];
export async function refreshDelivery(rows, { max = 25, timeoutMs = 2500 } = {}) {
  const nowIso = new Date().toISOString(), weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const due = rows.filter((r) => r.twilio_sid && PENDING_STATUSES.includes(r.status) && r.created_at > weekAgo &&
    !(r.status === "scheduled" && r.scheduled_for > nowIso)).slice(0, max);
  if (!due.length) return;
  const work = Promise.all(due.map(async (r) => {
    const t = await twilioStatus(r.twilio_sid).catch(() => null);
    if (!t?.ok || !t.status || t.status === r.status) return;
    const bad = t.status === "undelivered" || t.status === "failed";
    const patch = { status: bad ? "failed" : t.status, error: bad ? deliveryReason(t.code, t.error) : null };
    Object.assign(r, patch);
    await db().from("sms_messages").update(patch).eq("id", r.id);
  }));
  await Promise.race([work, new Promise((ok) => setTimeout(ok, timeoutMs))]); // never hold the hub up for long
}

// ---- the one send path (used by /api/send for Gwen & co, and /api/hub for the Team Hub) ----

// Logs one row. If the database is missing a newer optional column (batch_id, scheduled_for),
// it retries without it, so a missing migration never empties the shared log.
const OPTIONAL_LOG_COLUMNS = ["scheduled_for", "batch_id"];
async function logMessage(row) {
  let attempt = { ...row };
  let { error } = await db().from("sms_messages").insert(attempt);
  for (const col of OPTIONAL_LOG_COLUMNS) {
    if (!error) break;
    if (!(col in attempt)) continue;
    const { [col]: _drop, ...rest } = attempt;
    attempt = rest;
    ({ error } = await db().from("sms_messages").insert(attempt));
  }
  if (error) console.error("sms_messages log failed:", error.message);
}

// Validates, resolves recipients and (unless dryRun) sends. Returns { status, json } for the caller.
export async function deliver({ to, message, dryRun, sentBy, sendAt, batchId }) {
  const text = String(message || "").trim();
  if (!text) return { status: 400, json: { ok: false, error: "message is required" } };
  if (text.length > MAX_MESSAGE_CHARS) {
    return { status: 400, json: { ok: false, error: `message is over ${MAX_MESSAGE_CHARS} characters` } };
  }

  // Optional scheduled send: sendAt is ISO 8601 UTC; Twilio allows 15 minutes to 7 days out.
  let scheduleAt = null;
  if (sendAt) {
    const t = Date.parse(sendAt);
    if (Number.isNaN(t)) return { status: 400, json: { ok: false, error: "sendAt is not a valid date/time" } };
    const mins = (t - Date.now()) / 60000;
    if (mins < 15) return { status: 400, json: { ok: false, error: "A scheduled text must be at least 15 minutes from now" } };
    if (mins > 7 * 24 * 60) return { status: 400, json: { ok: false, error: "A scheduled text must be within 7 days" } };
    scheduleAt = new Date(t).toISOString().replace(/\.\d{3}Z$/, "Z"); // Twilio's format: 2026-11-01T18:00:00Z
  }

  let scouts;
  try { scouts = await loadScouts(); } catch (e) { return { status: 500, json: { ok: false, error: e.message } }; }

  const { entries, unmatched, recipients, skipped } = resolveRecipients(to, scouts);
  if (!entries.length) return { status: 400, json: { ok: false, error: "to is required" } };
  if (unmatched.length) {
    return { status: 400, json: {
      ok: false, error: `No scout matched: ${unmatched.join(", ")}`, unmatched,
      chapters: [...new Set(scouts.flatMap((s) => s.chapters || []))].sort(),
    } };
  }
  if (!recipients.length) return { status: 400, json: { ok: false, error: "Nobody in that group can be texted", skipped } };
  if (recipients.length > MAX_RECIPIENTS) {
    return { status: 400, json: { ok: false, error: `Too many recipients (${recipients.length}); max is ${MAX_RECIPIENTS}` } };
  }

  const template = withStopLine(text);
  const body = personalize(template, recipients[0]); // what the first person will see
  if (dryRun) return { status: 200, json: { ok: true, dryRun: true, body, template, recipients: recipients.map(publicScout), skipped, scheduledAt: scheduleAt } };

  const batch_id = batchId || randomUUID(); // groups one send to many people in the log (an edit keeps the same one)
  const results = [];
  let heldOk = !scheduleAt; // for a scheduled text: did Twilio confirm it is holding the first one?
  for (const s of recipients) {
    let r;
    const personal = personalize(template, s);
    // Safety: if Twilio sent the first "scheduled" text right away instead of holding it, stop before anyone else gets one early
    if (scheduleAt && !heldOk && results.some((x) => x.ok)) {
      results.push({ id: s.id, name: s.name, ok: false, error: "Not sent: Twilio did not hold the first text for the scheduled time, so the rest were stopped." });
      continue;
    }
    try { r = await twilioSend(s.phone, personal, scheduleAt); } catch (e) { r = { ok: false, error: e.message }; }
    if (scheduleAt && r.ok) heldOk = heldOk || r.status === "scheduled";
    results.push({ id: s.id, name: s.name, ok: r.ok, sid: r.sid, error: r.error });
    try {
      await logMessage({
        batch_id, scout_id: s.id, to_phone: s.phone, body: personal, twilio_sid: r.sid || null,
        status: r.ok ? r.status || "queued" : "failed", error: r.ok ? null : r.error,
        sent_by: String(sentBy || "api").slice(0, 80), scheduled_for: scheduleAt,
      });
      if (r.code === TWILIO_OPTED_OUT) {
        await db().from("sms_contacts").update({ opted_out_at: new Date().toISOString() }).eq("id", s.id);
      }
    } catch { /* the log is best-effort; never block a send on it */ }
  }
  const sent = results.filter((r) => r.ok).length;
  const notHeld = scheduleAt && sent > 0 && !heldOk;
  return { status: sent ? 200 : 502, json: {
    ok: sent === results.length && !notHeld, sent, failed: results.length - sent, body, template, results, skipped,
    scheduledAt: notHeld ? null : scheduleAt,
    ...(notHeld ? { error: `Twilio sent this right away instead of holding it until the scheduled time. Only ${sent} ${sent === 1 ? "person" : "people"} got it; the rest were stopped. Check that scheduling is enabled on the Twilio Messaging Service.` } : {}),
  } };
}
