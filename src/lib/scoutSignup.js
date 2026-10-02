// Helpers for the /scout-signup form (SMS opt-in).

// Stored verbatim with each opt-in as the consent record — keep it identical to what's shown.
export const SMS_CONSENT_TEXT =
  "Yes, text me reminders about my scouting assignments, deadlines, and receipts. I agree to " +
  "receive recurring automated SMS from Work & Brew at the mobile number I entered above. " +
  "Message frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.";

// US-friendly E.164: "(929) 471-8403" → "+19294718403". Null if it doesn't look like a number.
export function toE164(input) {
  const raw = String(input || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
