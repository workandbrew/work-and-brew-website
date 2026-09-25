import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import "./PageShared.css";

export default function ScoutSignup() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !consent) {
      setError("Please enter your name, phone number, and check the consent box.");
      return;
    }
    setError("");
    setDone(true);
    const subject = encodeURIComponent(`Scout SMS sign-up: ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nPhone: ${phone}\nConsent to SMS: YES\nDate: ${new Date().toString()}`
    );
    window.location.href = `mailto:support@workandbrew.app?subject=${subject}&body=${body}`;
  };

  return (
    <div className="page-shell">
      <Navbar />
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-badge">Team Text Reminders</div>
          <h1>Scout SMS Sign-Up</h1>

          {done ? (
            <p style={{ color: "#E0D9CF", textAlign: "center", lineHeight: 1.6 }}>
              ✅ You're set up to receive Work &amp; Brew scout reminders. If your email opened,
              hit send so we have your sign-up on record. Reply STOP to any text to opt out.
            </p>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <p style={{ color: "rgba(224,217,207,0.7)", fontSize: 13, textAlign: "center", margin: 0, lineHeight: 1.6 }}>
                Sign up to receive text reminders about your cafe scouting assignments,
                deadlines, and receipts.
              </p>

              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
              />
              <input
                type="tel"
                placeholder="Mobile phone number"
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
                  I agree to receive recurring automated text message reminders from Work &amp; Brew
                  at the phone number I provide. Message frequency varies. Msg &amp; data rates may
                  apply. Reply STOP to opt out, HELP for help.
                </label>
              </div>

              {error && <p style={{ color: "#ff8a70", fontSize: 12.5, margin: 0, textAlign: "center" }}>{error}</p>}

              <button type="submit" style={{ alignSelf: "center", width: "100%" }}>Sign Me Up</button>

              <p style={{ fontSize: 11.5, color: "rgba(224,217,207,0.5)", textAlign: "center", margin: "4px 0 0", lineHeight: 1.5 }}>
                By signing up you agree to our{" "}
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
