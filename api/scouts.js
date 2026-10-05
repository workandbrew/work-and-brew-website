// GET /api/scouts — the team roster (names, roles, chapters, whether they can be texted).
// Never returns full phone numbers — only the last 4 digits, for display.
//
//   Authorization: Bearer <SMS_API_KEY>

import { guard, loadScouts, publicScout } from "./_lib/sms.js";

export default async function handler(req, res) {
  if (!guard(req, res, ["GET"])) return;
  try {
    const scouts = (await loadScouts()).map(publicScout);
    const chapters = [...new Set(scouts.flatMap((s) => s.chapters))].sort();
    res.status(200).json({ ok: true, scouts, chapters });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
