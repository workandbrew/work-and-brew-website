// Short-lived signed values for the "Connect TikTok" round trip (no database needed).
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

const TTL_MS = 15 * 60 * 1000;
const key = () => process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const sign = (v) => createHmac("sha256", key()).update(v).digest("base64url");

export function makeState(now = Date.now()) {
  if (!key()) throw new Error("CRON_SECRET is not configured");
  const v = `${now}.${randomBytes(8).toString("base64url")}`;
  return `${v}.${sign(v)}`;
}

export function verifyState(state, now = Date.now()) {
  if (!key()) return false;
  const i = state.lastIndexOf(".");
  if (i < 0) return false;
  const v = state.slice(0, i);
  const a = Buffer.from(state.slice(i + 1)), b = Buffer.from(sign(v));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const t = Number(v.split(".")[0]);
  return Number.isFinite(t) && now - t >= 0 && now - t < TTL_MS;
}
