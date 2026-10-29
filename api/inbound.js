// POST /api/inbound — Twilio calls this whenever someone texts the Work & Brew number back.
//
// Set it in Twilio: Messaging → Services → (our service) → Integration → "Send a webhook",
// Request URL https://workandbrew.app/api/inbound, method POST.
//
// Every reply is saved to sms_replies (shown in Team Hub → Text Message System → Replies).
// STOP-style replies mark the person opted out right away; START clears it. Twilio itself still
// sends the official opt-out/opt-in confirmation, so this endpoint never texts anyone.
//
// Security: requests must carry a valid X-Twilio-Signature (needs TWILIO_AUTH_TOKEN in Vercel).
// If the account only uses API keys, set INBOUND_SECRET instead and add ?key=<INBOUND_SECRET> to the URL.
// Optional: SLACK_REPLIES_WEBHOOK posts each reply to a Slack channel.

import crypto from "node:crypto";
import { db, last4 } from "./_lib/sms.js";
import { signatureOk, replyKind } from "./_lib/inbound.js";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

function readForm(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return Object.fromEntries(new URLSearchParams(String(req.body || ""))); } catch { return {}; }
}

function secretOk(req) {
  const want = (process.env.INBOUND_SECRET || "").trim();
  if (!want) return false;
  const got = String(new URL(req.url, "https://x").searchParams.get("key") || "");
  const a = Buffer.from(got), b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("POST only");
  }
  const params = readForm(req);
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const url = `https://${host}${req.url}`;
  const token = (process.env.TWILIO_AUTH_TOKEN || "").trim();
  if (!signatureOk(token, url, params, req.headers["x-twilio-signature"]) && !secretOk(req)) {
    return res.status(403).send("Not from Twilio");
  }

  const from = String(params.From || "").trim();
  const body = String(params.Body || "").slice(0, 1600);
  const sid = String(params.MessageSid || params.SmsSid || "") || null;
  const kind = replyKind(body, params.OptOutType);

  try {
    const { data: contact } = await db().from("sms_contacts").select("id, name").eq("phone", from).maybeSingle();
    const { error } = await db().from("sms_replies").insert({ from_phone: from, contact_id: contact?.id || null, body, twilio_sid: sid, kind });
    if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message);
    if (contact && kind === "stop") await db().from("sms_contacts").update({ opted_out_at: new Date().toISOString() }).eq("id", contact.id);
    if (contact && kind === "start") await db().from("sms_contacts").update({ opted_out_at: null }).eq("id", contact.id);

    const hook = (process.env.SLACK_REPLIES_WEBHOOK || "").trim();
    if (hook && !error) {
      const who = contact?.name || `Unknown number •••• ${last4(from)}`;
      const text = kind === "stop" ? `${who} replied STOP and is now opted out of texts.` : `Text reply from ${who}: “${body.slice(0, 300)}”`;
      await fetch(hook, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) }).catch(() => {});
    }
  } catch (e) {
    // Answer Twilio with 200 anyway so it doesn't retry forever; the error lands in Vercel's logs
    console.error("inbound reply not saved:", e.message);
  }
  res.setHeader("Content-Type", "text/xml");
  return res.status(200).send(EMPTY_TWIML);
}
