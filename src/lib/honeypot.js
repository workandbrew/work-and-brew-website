// Hidden "honeypot" field name. formsubmit.co also ignores submissions where it is filled.
export const HONEYPOT_FIELD = "_honey";

// True when a form's hidden honeypot field was filled in (a bot, not a person).
export function isBot(event) {
  const field = event?.target?.elements?.[HONEYPOT_FIELD];
  return !!(field && field.value);
}
