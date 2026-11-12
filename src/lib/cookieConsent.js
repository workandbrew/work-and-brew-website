// Shared by the cookie banner (src/components/CookieConsent.jsx) and the footer's "Cookie settings" link.
export const CONSENT_KEY = "wb_cookie_consent";

export function openCookieSettings() {
  window.dispatchEvent(new Event("wb:cookie-settings"));
}
