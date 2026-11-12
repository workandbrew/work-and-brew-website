// Spam checks shared by public form endpoints.
//   1. Honeypot: a hidden field people never see. If it has a value, it's a bot.
//   2. Rate limit: max N requests per IP per window (best effort; per server instance).
//   3. reCAPTCHA v3: verified only when RECAPTCHA_SECRET_KEY is set in Vercel.

const hits = new Map();

export function isHoneypotFilled(body, field = "_honey") {
  return typeof body?.[field] === "string" && body[field].trim() !== "";
}

export function isRateLimited(req, { limit = 5, windowMs = 10 * 60 * 1000 } = {}) {
  const ip = String(req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // keep memory bounded
  return recent.length > limit;
}

export async function verifyRecaptcha(token, expectedAction, minScore = 0.5) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false, reason: "missing token" };
  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });
  const data = await res.json().catch(() => ({}));
  const ok = data.success === true && (data.score ?? 0) >= minScore && (!expectedAction || data.action === expectedAction);
  return { ok, score: data.score, reason: ok ? undefined : "low score or failed check" };
}
