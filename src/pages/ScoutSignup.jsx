import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import { supabase } from "../lib/supabaseClient";
import { SMS_CONSENT_TEXT, toE164 } from "../lib/scoutSignup";
import "./PageShared.css";

export default function ScoutSignup() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // SMS consent is intentionally OPTIONAL — only name is required to join the roster.
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (consent && !phone.trim()) {
      setError("Add your mobile number to receive texts, or uncheck the box to join without them.");
      return;
    }
    const e164 = consent ? toE164(phone) : null;
    if (consent && !e164) {
      setError("That mobile number doesn't look right — try a 10-digit US number like (929) 555-0123.");
      return;
    }
    setError("");
    setSubmitting(true);
    // Lands in signup_requests as "pending" until Den approves it. The phone number is only
    // kept when they opt into texts; the consent timestamp is set by the database.
    const { error: dbError } = await supabase.from("signup_requests").insert({
      name: name.trim().slice(0, 100),
      phone: e164,
      sms_consent: consent,
      consent_text: consent ? SMS_CONSENT_TEXT : null,
      source: "scout-signup",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    });
    setSubmitting(false);
    if (dbError) {
      setError("Something went wrong saving your sign-up. Please try again, or email support@workandbrew.app.");
      return;
    }
    setDone(true);
  };

  return (
    <div className="page-shell">
      <Navbar />
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-badge">Cafe Scout Team</div>
          <h1>Scout Roster Sign-Up</h1>

          {done ? (
            <p style={{ color: "#E0D9CF", textAlign: "center", lineHeight: 1.6 }}>
              {consent
                ? "✅ Thanks! Your sign-up for the Work & Brew scouting roster and text reminders is in — we'll confirm once you're added. Reply STOP to any text to opt out."
                : "✅ Thanks! Your sign-up for the Work & Brew scouting roster is in — we'll confirm once you're added. You chose not to receive text reminders, and that's totally fine."}
            </p>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <p style={{ color: "rgba(224,217,207,0.7)", fontSize: 13, textAlign: "center", margin: 0, lineHeight: 1.6 }}>
                Add your info to join the Work &amp; Brew cafe scouting roster. Text-message
                reminders are optional — you can join without them.
              </p>

              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
              />

              <p style={{ color: "rgba(224,217,207,0.6)", fontSize: 12, margin: "6px 0 -4px", textAlign: "left" }}>
                Want text reminders? Enter your mobile number and check the consent box below (optional):
              </p>
              <input
                type="tel"
                placeholder="Mobile number to receive text reminders"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setError(""); }}
              />

              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", width: "100%", textAlign: "left", marginTop: 2 }}>
                <input
                  type="checkbox"
                  id="scout-consent"
                  checked={consent}
                  onChange={(e) => { setConsent(e.target.checked); setError(""); }}
                  style={{
                    appearance: "auto",
                    WebkitAppearance: "auto",
                    width: 18,
                    height: 18,
                    minWidth: 18,
                    maxWidth: 18,
                    flex: "0 0 18px",
                    margin: "2px 0 0",
                    padding: 0,
                    border: "none",
                    background: "none",
                    boxSizing: "border-box",
                    accentColor: "#E0D9CF",
                    cursor: "pointer",
                  }}
                />
                <label htmlFor="scout-consent" style={{ flex: 1, color: "rgba(224,217,207,0.85)", fontSize: 12.5, lineHeight: 1.5, cursor: "pointer" }}>
                  <strong>(Optional)</strong> {SMS_CONSENT_TEXT}
                </label>
              </div>

              <p style={{ fontSize: 11.5, color: "rgba(224,217,207,0.5)", margin: "2px 0 0", lineHeight: 1.5, textAlign: "left" }}>
                Leaving this unchecked is completely fine — you'll still be added to the roster and
                simply won't receive text messages.
              </p>

              {error && <p style={{ color: "#ff8a70", fontSize: 12.5, margin: 0, textAlign: "center" }}>{error}</p>}

              <button type="submit" disabled={submitting} style={{ alignSelf: "center", width: "100%" }}>
                {submitting ? "Saving…" : "Join the Roster"}
              </button>

              <p style={{ fontSize: 11.5, color: "rgba(224,217,207,0.5)", textAlign: "center", margin: "4px 0 0", lineHeight: 1.5 }}>
                If you opt into texts, you agree to our{" "}
                <Link to="/sms-privacy" className="legal-link">SMS Privacy Policy</Link> and{" "}
                <Link to="/sms-terms" className="legal-link">SMS Terms</Link>. We never share your
                number with third parties for marketing.
              </p>
            </form>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
