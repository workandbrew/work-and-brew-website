import { useState } from "react";
import Navbar from "../components/Navbar";
import "./PageShared.css";

const REASONS = [
  "Free spotlight on our verified NYC café map",
  "Real foot traffic from remote workers & students",
  "Scouts visit in person — no fake reviews, ever",
  "Your story told the way you'd actually tell it",
  "Work-friendly stats (wifi, outlets, seating) done for you",
  "Zero fees, zero contracts, zero catch",
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
      <Navbar />
      <div className="owners-content">
        <div className="page-badge">TBD</div>
        <h1 className="page-title">
          Get discovered by the right people, <br />your new regulars.
        </h1>
        {/* intro paragraph with the tagline sitting to its right */}
        <div className="owners-intro-row">
          <p className="page-body">
            Work & Brew puts small, independent cafés front and center. We
            personally visit, verify, and highlight what makes your space unique
            — so remote workers can find you, trust you, and keep coming back.
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
            <h2>Why work with us?</h2>
            <ul>
              {REASONS.map((reason) => (
                <li key={reason}>
                  <span className="owners-why-arrow">▸</span>gi
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
            <span className="owner-field-label">Café Name</span>
            <input
              type="text"
              name="cafe"
              placeholder="Café name"
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
                workandbrew.app@gmail.com
              </p>
            )}
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
