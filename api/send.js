// POST /api/send — the one protected endpoint everything sends texts through
// (Gwen, scheduled reminders, the future iPhone Shortcut).
//
//   Authorization: Bearer <SMS_API_KEY>
//   X-Sent-By: gwen | schedule | shortcut | cli      (optional, recorded in the send log)
//   { "to": "Bronx" | ["Orlando", "Manhattan-UWS"] | "all" | "<scout id>" | "+1...",
//     "message": "New cafe assignments are up, due Friday.",
//     "dryRun": true }
//
// dryRun: resolves recipients and returns the exact text WITHOUT sending — this is how Gwen
// builds a draft for Den to approve. Approving re-sends the same request with dryRun:false and
// `to` set to the scout ids from the draft, so exactly the people shown get the text.
//
// Only active, opted-in scouts from the Supabase `scouts` table can be texted. If any `to`
// entry matches nobody, the whole request is rejected rather than silently sending to fewer.

import {
  guard, readBody, loadScouts, resolveRecipients, withStopLine, publicScout, twilioSend, db,
  MAX_RECIPIENTS, MAX_MESSAGE_CHARS, TWILIO_OPTED_OUT,
} from "./_lib/sms.js";

export default async function handler(req, res) {
  if (!guard(req, res, ["POST"])) return;
  const { to, message, dryRun } = readBody(req);
  const sentBy = String(req.headers["x-sent-by"] || "api").slice(0, 40);

  const text = String(message || "").trim();
  if (!text) return res.status(400).json({ ok: false, error: "message is required" });
  if (text.length > MAX_MESSAGE_CHARS) {
    return res.status(400).json({ ok: false, error: `message is over ${MAX_MESSAGE_CHARS} characters` });
  }

  let scouts;
  try { scouts = await loadScouts(); } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }

  const { entries, unmatched, recipients, skipped } = resolveRecipients(to, scouts);
  if (!entries.length) return res.status(400).json({ ok: false, error: "to is required" });
  if (unmatched.length) {
    return res.status(400).json({
      ok: false, error: `No scout matched: ${unmatched.join(", ")}`, unmatched,
      chapters: [...new Set(scouts.flatMap((s) => s.chapters || []))].sort(),
    });
  }
  if (!recipients.length) return res.status(400).json({ ok: false, error: "Nobody in that group can be texted", skipped });
  if (recipients.length > MAX_RECIPIENTS) {
    return res.status(400).json({ ok: false, error: `Too many recipients (${recipients.length}); max is ${MAX_RECIPIENTS}` });
  }

  const body = withStopLine(text);
  const preview = { body, recipients: recipients.map(publicScout), skipped };
  if (dryRun) return res.status(200).json({ ok: true, dryRun: true, ...preview });

  const results = [];
  for (const s of recipients) {
    let r;
    try { r = await twilioSend(s.phone, body); } catch (e) { r = { ok: false, error: e.message }; }
    results.push({ id: s.id, name: s.name, ok: r.ok, sid: r.sid, error: r.error });
    try {
      await db().from("sms_messages").insert({
        scout_id: s.id, to_phone: s.phone, body, twilio_sid: r.sid || null,
        status: r.ok ? r.status || "queued" : "failed", error: r.ok ? null : r.error, sent_by: sentBy,
      });
      if (r.code === TWILIO_OPTED_OUT) {
        await db().from("scouts").update({ opted_out_at: new Date().toISOString() }).eq("id", s.id);
      }
    } catch { /* the log is best-effort; never block a send on it */ }
  }
  const sent = results.filter((r) => r.ok).length;
  res.status(sent ? 200 : 502).json({ ok: sent === results.length, sent, failed: results.length - sent, body, results, skipped });
}
