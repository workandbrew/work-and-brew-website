import { useState } from "react";
import "./SuggestionForm.css";

// Submissions go to workandbrew.app@gmail.com via formsubmit.co (same as the
// For Owners form). No account or API keys needed — formsubmit.co will send a
// one-time confirmation email to that inbox the very first time this fires.
// Click the confirmation link once and all future submissions go straight through.
const FORM_ENDPOINT = "https://formsubmit.co/ajax/workandbrew.app@gmail.com";

const MAX_CHARS = 300;
const EMPTY = { name: "", email: "", message: "" };

export default function SuggestionForm({ cafeName }) {
  const [open, setOpen]     = useState(false);
  const [form, setForm]     = useState(EMPTY);
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "message" && value.length > MAX_CHARS) return;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `Café suggestion: ${cafeName}`,
          _template: "table",
          cafe_name:  cafeName,
          from_name:  form.name,
          from_email: form.email,
          message:    form.message,
        }),
      });
      if (!res.ok) throw new Error(`formsubmit responded ${res.status}`);
      setStatus("sent");
      setForm(EMPTY);
    } catch (err) {
      console.error("Suggestion form error:", err);
      setStatus("error");
    }
  };

  const handleClose = () => {
    setOpen(false);
    setStatus("idle");
    setForm(EMPTY);
  };

  // ── Trigger button — always visible in the café panel ─────────────────────
  return (
    <>
      <button className="suggestion-toggle" onClick={() => setOpen(true)}>
        💬 Have a suggestion?
      </button>

      {open && (
        <div className="suggestion-overlay" onClick={handleClose}>
          <div className="suggestion-wrap" onClick={(e) => e.stopPropagation()}>
            <div className="suggestion-header">
              <span>Suggest a change for {cafeName}</span>
              <button
                className="suggestion-x"
                type="button"
                aria-label="Close"
                onClick={handleClose}
              >
                ✕
              </button>
            </div>

            {status === "sent" ? (
              <div className="suggestion-success">
                <span>☕</span>
                <p>Thanks! We'll look into it.</p>
                <button type="button" onClick={handleClose}>Close</button>
              </div>
            ) : (
              <form className="suggestion-form" onSubmit={handleSubmit}>
                <input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Your Email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />

                <div className="suggestion-textarea-wrap">
                  <textarea
                    name="message"
                    placeholder="What should we know? (e.g. hours changed, WiFi is down…)"
                    value={form.message}
                    onChange={handleChange}
                    rows={5}
                    required
                  />
                  <span
                    className={`suggestion-charcount ${
                      form.message.length >= MAX_CHARS ? "at-limit" : ""
                    }`}
                  >
                    {form.message.length}/{MAX_CHARS}
                  </span>
                </div>

                {status === "error" && (
                  <p className="suggestion-error">
                    Something didn't go through — try again or reach us at{" "}
                    <a href="mailto:workandbrew.app@gmail.com">workandbrew.app@gmail.com</a> ☕
                  </p>
                )}

                <div className="suggestion-actions">
                  <button type="button" className="suggestion-cancel" onClick={handleClose}>
                    Cancel
                  </button>
                  <button type="submit" className="suggestion-submit" disabled={status === "sending"}>
                    {status === "sending" ? "Sending…" : "Send ☕"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
