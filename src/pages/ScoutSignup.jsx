import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import "./PageShared.css";

const SECURITY_CODE = "032025";

function SecurityGate({ onUnlock }) {
  const [code, setCode]     = useState("");
  const [error, setError]   = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.trim() === SECURITY_CODE) {
      onUnlock();
    } else {
      setError("Incorrect code. Reach out to the Work & Brew team if you need access.");
      setCode("");
    }
  };

  return (
    <div className="page-shell">
      <Navbar />
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-badge">Team Access Only</div>
          <h1 style={{ textAlign: "center" }}>Security Code Required</h1>
          <p style={{ color: "rgba(224,217,207,0.65)", fontSize: 13.5, textAlign: "center", lineHeight: 1.6, margin: "0 0 8px" }}>
            This page is for Work &amp; Brew team members only. Please enter the
            security code you received from the team to continue.
          </p>
          <form className="auth-form" onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="Enter security code"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(""); }}
              autoComplete="off"
              style={{ textAlign: "center", letterSpacing: "0.2em" }}
            />
            {error && (
              <p style={{ color: "#ff8a70", fontSize: 12.5, margin: 0, textAlign: "center" }}>{error}</p>
            )}
            <button type="submit" style={{ width: "100%" }}>Confirm →</button>
          </form>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

export default function ScoutSignup() {
  const [unlocked, setUnlocked] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = (e) => {
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
    setError("");
    setDone(true);
    const subject = encodeURIComponent(`Scout roster sign-up: ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nPhone: ${phone || "(not provided)"}\nSMS reminders opt-in: ${consent ? "YES" : "No"}\nDate: ${new Date().toString()}`
    );
    window.location.href = `mailto:support@workandbrew.app?subject=${subject}&body=${body}`;
  };

  if (!unlocked) return <SecurityGate onUnlock={() => setUnlocked(true)} />;

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
                ? "✅ You're on the Work & Brew scouting roster and signed up for text reminders. If your email opened, hit send to confirm. Reply STOP to any text to opt out."
                : "✅ You're on the Work & Brew scouting roster. You chose not to receive text reminders — that's totally fine. If your email opened, hit send to confirm."}
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
                  <strong>(Optional)</strong> Yes, text me reminders about my scouting assignments,
                  deadlines, and receipts. I agree to receive recurring automated SMS from Work &amp;
                  Brew at the mobile number I entered above. Message frequency varies. Msg &amp; data
                  rates may apply. Reply STOP to opt out, HELP for help.
                </label>
              </div>

              <p style={{ fontSize: 11.5, color: "rgba(224,217,207,0.5)", margin: "2px 0 0", lineHeight: 1.5, textAlign: "left" }}>
                Leaving this unchecked is completely fine — you'll still be added to the roster and
                simply won't receive text messages.
              </p>

              {error && <p style={{ color: "#ff8a70", fontSize: 12.5, margin: 0, textAlign: "center" }}>{error}</p>}

              <button type="submit" style={{ alignSelf: "center", width: "100%" }}>Join the Roster</button>

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
