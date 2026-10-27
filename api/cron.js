// /api/cron — the daily run (Vercel Cron, see vercel.json). Sends today's scheduled weekly texts
// and the next step of each new scout's welcome series; on Mondays it also refreshes the Instagram token.
//
// Vercel calls it with  Authorization: Bearer <CRON_SECRET>  (set CRON_SECRET in Vercel env).
// Without CRON_SECRET configured, nothing runs.

import { timingSafeEqual } from "node:crypto";
import { runSchedules, runWelcomeSeries } from "./_lib/automation.js";
import { refreshInstagramToken } from "./_lib/growth.js";

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(String(req.headers?.authorization || ""));
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export default async function handler(req, res) {
  if (!authorized(req)) return res.status(401).json({ ok: false, error: "unauthorized" });
  const out = { ok: true };
  try { out.schedules = await runSchedules(); } catch (e) { out.ok = false; out.schedulesError = e.message; }
  try { out.welcome = await runWelcomeSeries(); } catch (e) { out.ok = false; out.welcomeError = e.message; }
  // Keep the Instagram token alive (once a week is plenty; refreshing daily is also fine).
  if (new Date().getUTCDay() === 1) {
    try { out.instagram = await refreshInstagramToken(); } catch (e) { out.instagramError = e.message; }
  }
  res.status(out.ok ? 200 : 500).json(out);
}
