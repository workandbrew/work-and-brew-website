// Helpers for texts people send back to the Work & Brew number (Twilio → /api/inbound).
import crypto from "node:crypto";

// Twilio signs every webhook: HMAC-SHA1 over the full URL plus each POST field (sorted by name, name+value
// appended), keyed with the account's auth token, base64-encoded in the X-Twilio-Signature header.
export function twilioSignature(authToken, url, params) {
  const data = Object.keys(params || {}).sort().reduce((s, k) => s + k + String(params[k] ?? ""), url);
  return crypto.createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64");
}

export function signatureOk(authToken, url, params, header) {
  if (!authToken || !header) return false;
  const want = Buffer.from(twilioSignature(authToken, url, params));
  const got = Buffer.from(String(header));
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

// What a reply means for texting permission. Twilio passes OptOutType when Advanced Opt-Out is on;
// otherwise fall back to the standard keywords.
const STOP = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "REVOKE", "OPTOUT"];
const START = ["START", "UNSTOP", "YES", "OPTIN"];
export function replyKind(body, optOutType) {
  const t = String(optOutType || "").toUpperCase();
  if (t === "STOP") return "stop";
  if (t === "START") return "start";
  if (t === "HELP") return "help";
  const word = String(body || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (STOP.includes(word)) return "stop";
  if (START.includes(word)) return "start";
  if (word === "HELP" || word === "INFO") return "help";
  return "message";
}
