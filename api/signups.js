// /api/signups — review new opt-ins from /scout-signup ("pending requests").
//
//   Authorization: Bearer <SMS_API_KEY>
//   GET                     → pending requests
//   POST { id, action: "approve", chapters?: ["Bronx"], role?: "Cafe Scout" }
//                           → copies the person (and their consent record) into `scouts`
//   POST { id, action: "reject" }

import { guard, readBody, db, last4 } from "./_lib/sms.js";

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
    const { data: request, error: readErr } = await db()
      .from("signup_requests").select("*").eq("id", id).eq("status", "pending").maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!request) return res.status(404).json({ ok: false, error: "No pending request with that id" });

    let scout = null;
    if (action === "approve") {
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
      const { data, error } = await write.select("id, name, chapters, sms_opt_in").single();
      if (error) throw new Error(error.message);
      scout = data;
    }

    const { error: updErr } = await db()
      .from("signup_requests")
      .update({ status: action === "approve" ? "approved" : "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (updErr) throw new Error(updErr.message);
    res.status(200).json({ ok: true, action, scout });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
