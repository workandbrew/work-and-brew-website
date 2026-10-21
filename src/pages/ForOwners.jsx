import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PageShared.css";

function MinimalNav() {
  const navigate = useNavigate();
  return (
    <nav style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 28px",
      borderBottom: "1px solid rgba(224,217,207,0.18)",
      background: "#180A02",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <img
        src="/logo.png"
        alt="Work & Brew"
        style={{ height: "32px", cursor: "pointer", opacity: 0.92 }}
        onClick={() => navigate("/")}
      />
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "transparent",
            border: "1px solid rgba(242,236,227,0.25)",
            color: "#F2ECE3",
            borderRadius: "8px",
            padding: "7px 16px",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.03em",
            transition: "border-color 0.15s",
          }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = "rgba(242,236,227,0.6)"}
          onMouseOut={(e) => e.currentTarget.style.borderColor = "rgba(242,236,227,0.25)"}
        >
          ← Home
        </button>
        <button
          onClick={() => navigate("/login")}
          style={{
            background: "#F2ECE3",
            border: "none",
            color: "#180A02",
            borderRadius: "8px",
            padding: "7px 16px",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.03em",
            transition: "opacity 0.15s",
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = "0.85"}
          onMouseOut={(e) => e.currentTarget.style.opacity = "1"}
        >
          Login
        </button>
      </div>
    </nav>
  );
}

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
    setStatus("sending");
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `New café interest: ${form.cafe}`,
          _template: "table",
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
    <div className="page-shell">
      <MinimalNav />
      <div className="owners-content">
        <div className="page-badge">Business Inquiries & Content Creators</div>
        <h1 className="page-title">
          Get discovered by the right people, <br />your new regulars.
        </h1>
        {/* intro paragraph with the tagline sitting to its right */}
        <div className="owners-intro-row">
          <p className="page-body">
            Work & Brew puts small, independent cafés front and center, for free. We
            personally visit, verify, and highlight what makes your space unique,
            so remote workers can find you, trust you, and keep coming back.
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
            <span className="owner-field-label">Your Name <span className="owner-req">*</span></span>
            <input
              type="text"
              name="name"
              placeholder="Your name"
              value={form.name}
              onChange={handleChange}
              required
            />
            <span className="owner-field-label">Café Name/Platform</span>
            <input
              type="text"
              name="cafe"
              placeholder="Name"
              value={form.cafe}
              onChange={handleChange}
            />
            <span className="owner-field-label">Your Email <span className="owner-req">*</span></span>
            <input
              type="email"
              name="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
              required
            />
            <span className="owner-field-label">Phone Number</span>
            <input
              type="tel"
              name="phone"
              placeholder="Phone number (optional)"
              value={form.phone}
              onChange={handleChange}
            />
            <span className="owner-field-label">Message <span className="owner-req">*</span></span>
            <textarea
              name="reason"
              placeholder="Tell us a little about your café..."
              rows={5}
              value={form.reason}
              onChange={handleChange}
              required
            />
            <button type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending... ☕" : "Submit Interest ☕"}
            </button>
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
