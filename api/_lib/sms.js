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
const STOP_LINE = "Reply STOP to opt out.";

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

export function last4(phone) {
  return phone ? phone.slice(-4) : null;
}

// ---- recipient resolution ----

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Which scouts one `to` entry refers to. Order matters: id → phone → "all" → chapter → name.
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
    .select("id, name, phone, role, chapters, sms_opt_in, active, opted_out_at")
    .eq("active", true)
    .order("name");
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data || [];
}

// ---- Twilio ----

export async function twilioSend(to, body) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const user = process.env.TWILIO_API_KEY_SID || accountSid;
  const pass = process.env.TWILIO_API_KEY_SECRET || process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !messagingServiceSid || !pass) {
    throw new Error("Twilio credentials are not configured");
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${user}:${pass}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, MessagingServiceSid: messagingServiceSid, Body: body }),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok
    ? { ok: true, sid: data.sid, status: data.status }
    : { ok: false, code: data.code, error: data.message || `Twilio HTTP ${res.status}` };
}

// Twilio error 21610 = recipient replied STOP.
export const TWILIO_OPTED_OUT = 21610;

// ---- the one send path (used by /api/send for Gwen & co, and /api/hub for the Team Hub) ----

// Logs one row; if the database is missing a newer column (e.g. batch_id), logs without it.
async function logMessage(row) {
  let { error } = await db().from("sms_messages").insert(row);
  if (error && row.batch_id) {
    const { batch_id: _drop, ...rest } = row;
    ({ error } = await db().from("sms_messages").insert(rest));
  }
  if (error) console.error("sms_messages log failed:", error.message);
}

// Validates, resolves recipients and (unless dryRun) sends. Returns { status, json } for the caller.
export async function deliver({ to, message, dryRun, sentBy }) {
  const text = String(message || "").trim();
  if (!text) return { status: 400, json: { ok: false, error: "message is required" } };
  if (text.length > MAX_MESSAGE_CHARS) {
    return { status: 400, json: { ok: false, error: `message is over ${MAX_MESSAGE_CHARS} characters` } };
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

  const body = withStopLine(text);
  if (dryRun) return { status: 200, json: { ok: true, dryRun: true, body, recipients: recipients.map(publicScout), skipped } };

  const batch_id = randomUUID(); // groups one send to many people in the log
  const results = [];
  for (const s of recipients) {
    let r;
    try { r = await twilioSend(s.phone, body); } catch (e) { r = { ok: false, error: e.message }; }
    results.push({ id: s.id, name: s.name, ok: r.ok, sid: r.sid, error: r.error });
    try {
      await logMessage({
        batch_id, scout_id: s.id, to_phone: s.phone, body, twilio_sid: r.sid || null,
        status: r.ok ? r.status || "queued" : "failed", error: r.ok ? null : r.error,
        sent_by: String(sentBy || "api").slice(0, 80),
      });
      if (r.code === TWILIO_OPTED_OUT) {
        await db().from("sms_contacts").update({ opted_out_at: new Date().toISOString() }).eq("id", s.id);
      }
    } catch { /* the log is best-effort; never block a send on it */ }
  }
  const sent = results.filter((r) => r.ok).length;
  return { status: sent ? 200 : 502, json: { ok: sent === results.length, sent, failed: results.length - sent, body, results, skipped } };
}
