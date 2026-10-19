// POST /api/send — the protected endpoint machines send texts through
// (Gwen, scheduled reminders, the future iPhone Shortcut). People use the Team Hub (/team).
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
// Only active, opted-in people in the Supabase `sms_contacts` table can be texted. If any `to`
// entry matches nobody, the whole request is rejected rather than silently sending to fewer.

import { guard, readBody, deliver } from "./_lib/sms.js";

export default async function handler(req, res) {
  if (!guard(req, res, ["POST"])) return;
  const { to, message, dryRun } = readBody(req);
  const sentBy = String(req.headers["x-sent-by"] || "api").slice(0, 40);
  const { status, json } = await deliver({ to, message, dryRun, sentBy });
  res.status(status).json(json);
}
