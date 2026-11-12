import { useEffect, useState } from "react";
import "./CookieConsent.css";
import { CONSENT_KEY } from "../lib/cookieConsent";

// Google Analytics only loads after a visitor taps Accept (see window.wbLoadAnalytics in index.html).
// The choice is remembered on this device; "Cookie settings" in the footer reopens this banner.

function readChoice() {
  try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
}

export default function CookieConsent() {
  const [open, setOpen] = useState(() => !readChoice());

  useEffect(() => {
    const reopen = () => setOpen(true);
    window.addEventListener("wb:cookie-settings", reopen);
    return () => window.removeEventListener("wb:cookie-settings", reopen);
  }, []);

  const choose = (value) => {
    try { localStorage.setItem(CONSENT_KEY, value); } catch { /* private mode: ask again next visit */ }
    if (value === "granted") window.wbLoadAnalytics?.();
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div className="cookie-consent" role="dialog" aria-live="polite" aria-label="Cookie choices">
      <p className="cookie-consent-text">
        We use cookies for Google Analytics to see which pages help people find cafés. No ads, no selling your data.{" "}
        <a href="/privacy" className="cookie-consent-link">Privacy Policy</a>
      </p>
      <div className="cookie-consent-actions">
        <button type="button" className="cookie-consent-btn" onClick={() => choose("denied")}>Decline</button>
        <button type="button" className="cookie-consent-btn cookie-consent-btn--primary" onClick={() => choose("granted")}>Accept</button>
      </div>
    </div>
  );
}
