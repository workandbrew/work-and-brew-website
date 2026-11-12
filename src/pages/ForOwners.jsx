import { useState } from "react";
import Honeypot from "../components/Honeypot";
import { isBot } from "../lib/honeypot";
import Navbar from "../components/Navbar";
import "./PageShared.css";


const REASONS = [
  "Real, free, foot traffic from remote workers & students",
  "Scouts visit in person and give no fake reviews, ever",
  "Your story told the way you'd actually tell it",
  "No WiFi password or bathroom codes sharing, ever",
  "Work-friendly stats (wifi, outlets, seating) done for you",
  "Consideration for both cafe owners and customers, always",
];

const REASONS_CREATOR = [
  "If selected, we’ll take care of your order for your next work/study session",
  "We care about your potential and creative eye, not your follower count",
  "Consistent partners get first dibs on upcoming PR packages and bigger collabs",
  "We love reposting and spotlighting our favorite creator posts",
];

// form submissions land in the Work & Brew inbox via formsubmit.co
const FORM_ENDPOINT = "https://formsubmit.co/ajax/workandbrew.app@gmail.com";

export default function ForOwners() {
  const [form, setForm] = useState({
    name: "",
    cafe: "",
    email: "",
    phone: "",
    reason: "",
  });
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBot(e)) { setStatus("sent"); return; } // drop silently
    if (!form.name.trim() || !form.email.trim() || !form.reason.trim()) { setStatus("invalid"); return; }
    setStatus("sending");
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `New café interest: ${form.cafe}`,
          _template: "table",
          _honey: "",
          ...form,
        }),
      });
      if (!res.ok) throw new Error("send failed");
      setStatus("sent");
      setForm({ name: "", cafe: "", email: "", phone: "", reason: "" });
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="page-shell" style={{ paddingTop: 0 }}>
      <Navbar />
      <div style={{ height: "var(--nav-h, 80px)" }} aria-hidden="true" />
      <div className="owners-content" style={{ paddingTop: "2rem" }}>
        <div className="page-badge">Business Inquiries & Content Creators</div>
        <h1 className="page-title">
          Get discovered by the right people, <br />your new regulars.
        </h1>
        {/* intro paragraph with the tagline sitting to its right */}
        <div className="owners-intro-row">
          <p className="page-body">
            Work &amp; Brew handpicks and chooses every single cafe we place on our map because we build with the mission of supporting our New York City cafes we know deserve the recognition. So new yorkers can find you, trust you and keep coming back.
          </p>
          <p className="owners-tagline">
            Verified by New Yorkers.<br />
            Based in New York City.<br />
            Discovering daily.
          </p>
        </div>

        <div className="owners-layout">
          {/* Why work with us */}
          <div className="owners-why">
            <h2>Why Work With Us?</h2>
            <ul>
              {REASONS.map((reason) => (
                <li key={reason}>
                  <span className="owners-why-arrow">▸</span>
                  {reason}
                </li>
              ))}
            </ul>
            <br></br>
            <h2>NYC Content Creator?</h2>
            <ul>
              {REASONS_CREATOR.map((reason) => (
                <li key={reason}>
                  <span className="owners-why-arrow">▸</span>
                  {reason}
                </li>
              ))}
            </ul>
            <p className="owners-why-footnote">
              Don't want your café listed here?{" "}
              <a href="mailto:workandbrew.app@gmail.com">Let us know!</a>
            </p>

          </div>

          {/* Interest form — swaps to a thank-you card once sent */}
          {status === "sent" ? (
            <div className="owner-form-success">
              <span className="owner-form-success-cup">☕</span>
              <p>Thanks! Your message is on its way — we'll be in touch. ☕</p>
              <button type="button" onClick={() => setStatus("idle")}>
                Send another message
              </button>
            </div>
          ) : (
          <form className="owner-form" onSubmit={handleSubmit}>
            <h2>Let's Connect!</h2>
            <Honeypot />
            <span className="owner-field-label">Your Name <span className="owner-req">*</span></span>
            <input
              type="text"
              name="name"
              placeholder="Your name"
              aria-label="Your name"
              autoComplete="name"
              maxLength={100}
              value={form.name}
              onChange={handleChange}
              required
            />
            <span className="owner-field-label">Café Name/Platform</span>
            <input
              type="text"
              name="cafe"
              placeholder="Name"
              aria-label="Café name or platform"
              maxLength={150}
              value={form.cafe}
              onChange={handleChange}
            />
            <span className="owner-field-label">Your Email <span className="owner-req">*</span></span>
            <input
              type="email"
              name="email"
              placeholder="your@email.com"
              aria-label="Your email"
              autoComplete="email"
              maxLength={254}
              value={form.email}
              onChange={handleChange}
              required
            />
            <span className="owner-field-label">Phone Number</span>
            <input
              type="tel"
              name="phone"
              placeholder="Phone number (optional)"
              aria-label="Phone number (optional)"
              autoComplete="tel"
              maxLength={25}
              pattern="[0-9+()\-\s.]{7,25}"
              title="Digits, spaces, and + ( ) - only"
              value={form.phone}
              onChange={handleChange}
            />
            <span className="owner-field-label">Message <span className="owner-req">*</span></span>
            <textarea
              name="reason"
              placeholder="Tell us a little about your café..."
              aria-label="Message"
              maxLength={2000}
              rows={5}
              value={form.reason}
              onChange={handleChange}
              required
            />
            <button type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending... ☕" : "Submit Interest ☕"}
            </button>
            {status === "invalid" && (
              <p className="form-status form-status--err" role="alert">
                Please fill in your name, email, and a message.
              </p>
            )}
            {status === "error" && (
              <p className="form-status form-status--err">
                Hmm, that didn't go through. Try again or email us directly at
                collaborations@workandbrew.app
              </p>
            )}
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
