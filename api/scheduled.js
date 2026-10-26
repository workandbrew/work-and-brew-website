// GET  /api/scheduled  → texts scheduled for the future that haven't sent yet (grouped)
// POST /api/scheduled  → cancel scheduled texts: { "sids": ["SM..."] }  or  { "all": true }
//
//   Authorization: Bearer <SMS_API_KEY>
//
// Canceling only stops a message Twilio is still holding; it never sends anything.
import { guard, db, twilioCancel, last4 } from "./_lib/sms.js";

export default async function handler(req, res) {
  if (!guard(req, res, ["GET", "POST"])) return;
  const nowIso = new Date().toISOString();

  if (req.method === "GET") {
    try {
      const { data, error } = await db()
        .from("sms_messages")
        .select("to_phone, body, twilio_sid, scheduled_for")
        .eq("status", "scheduled")
        .gt("scheduled_for", nowIso)
        .order("scheduled_for");
      if (error) throw new Error(error.message);
      const groups = {};
      for (const m of data || []) {
        const k = m.scheduled_for + "|" + m.body;
        groups[k] = groups[k] || { scheduledFor: m.scheduled_for, body: m.body, count: 0, sids: [], toLast4: [] };
        groups[k].count++;
        if (m.twilio_sid) groups[k].sids.push(m.twilio_sid);
        groups[k].toLast4.push(last4(m.to_phone));
      }
      return res.status(200).json({ ok: true, scheduled: Object.values(groups) });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  let sids = Array.isArray(body.sids) ? body.sids.filter(Boolean) : [];
  try {
    if (body.all) {
      const { data } = await db()
        .from("sms_messages")
        .select("twilio_sid")
        .eq("status", "scheduled")
        .gt("scheduled_for", nowIso);
      sids = (data || []).map((r) => r.twilio_sid).filter(Boolean);
    }
    if (!sids.length) return res.status(400).json({ ok: false, error: "No scheduled texts to cancel" });
    let canceled = 0;
    const failed = [];
    for (const sid of sids) {
      let r;
      try { r = await twilioCancel(sid); } catch (e) { r = { ok: false, error: e.message }; }
      if (r.ok) {
        canceled++;
        try { await db().from("sms_messages").update({ status: "canceled" }).eq("twilio_sid", sid); } catch { /* best-effort */ }
      } else {
        failed.push(r.error);
      }
    }
    return res.status(200).json({ ok: canceled > 0, canceled, requested: sids.length, failed });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
