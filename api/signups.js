// /api/signups — review new opt-ins from /scout-signup ("pending requests").
//
//   Authorization: Bearer <SMS_API_KEY>
//   GET                     → pending requests
//   POST { id, action: "approve", chapters?: ["Bronx"], role?: "Cafe Scout" }
//                           → copies the person (and their consent record) onto the team and texts the welcome
//   POST { id, action: "reject" }

import { guard, readBody, db, last4 } from "./_lib/sms.js";
import { approveSignup, rejectSignup } from "./_lib/automation.js";

export default async function handler(req, res) {
  if (!guard(req, res, ["GET", "POST"])) return;
  try {
    if (req.method === "GET") {
      const { data, error } = await db()
        .from("signup_requests")
        .select("id, name, phone, sms_consent, consent_at, created_at")
        .eq("status", "pending")
        .order("created_at");
      if (error) throw new Error(error.message);
      const requests = (data || []).map(({ phone, ...r }) => ({ ...r, phoneLast4: last4(phone) }));
      return res.status(200).json({ ok: true, requests });
    }

    const { id, action, chapters, role } = readBody(req);
    if (!id || !["approve", "reject"].includes(action)) {
      return res.status(400).json({ ok: false, error: 'id and action ("approve" or "reject") are required' });
    }
    const r = action === "approve" ? await approveSignup(id, { chapters, role }) : await rejectSignup(id);
    if (r.status !== 200) return res.status(r.status).json({ ok: false, error: r.error });
    res.status(200).json({ ok: true, action, scout: r.scout || null, welcome: r.welcome || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
