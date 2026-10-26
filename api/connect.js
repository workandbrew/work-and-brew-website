// /api/connect — one-time "Connect TikTok" sign-in for the Team Hub's Growth & Social page.
//
//   GET ?start=<state>      → sends the browser to TikTok to approve read-only access
//   GET ?code=…&state=…     → TikTok sends the browser back here; we save the token and return to the hub
//
// The state is a short-lived signed value the hub hands out only to logged-in department heads
// (POST /api/hub { action: "tiktok-connect" }), so nobody else can attach an account.

import { verifyState } from "./_lib/connectState.js";
import { tiktokAuthUrl, tiktokFinishConnect, tiktokReady } from "./_lib/growth.js";

const back = (res, msg) => {
  res.setHeader("Location", `/team/growth?connected=${encodeURIComponent(msg)}`);
  res.status(302).end();
};

export default async function handler(req, res) {
  const { start, code, state, error } = req.query || {};
  if (!tiktokReady()) return back(res, "TikTok keys aren't set up in Vercel yet.");
  if (start) {
    if (!verifyState(String(start))) return back(res, "That link expired. Click Connect TikTok again.");
    res.setHeader("Location", tiktokAuthUrl(String(start)));
    return res.status(302).end();
  }
  if (error) return back(res, "TikTok connection was cancelled.");
  if (!code || !verifyState(String(state || ""))) return back(res, "That link expired. Click Connect TikTok again.");
  try {
    await tiktokFinishConnect(String(code));
    back(res, "TikTok is connected.");
  } catch (e) {
    back(res, `TikTok didn't connect: ${e.message}`);
  }
}
