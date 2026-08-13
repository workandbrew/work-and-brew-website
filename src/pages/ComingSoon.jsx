import { useState, useEffect } from "react";

const PREVIEW_PASSWORD = "teambrew";
const LAUNCH_DATE = new Date("2026-08-16T00:00:00");
const STORAGE_KEY = "wb_preview_unlocked";

function getTimeLeft() {
  const diff = LAUNCH_DATE - new Date();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function ComingSoon({ children }) {
  const [unlocked, setUnlocked] = useState(
    () => localStorage.getItem(STORAGE_KEY) === "true"
  );
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [time,     setTime]     = useState(getTimeLeft());

  useEffect(() => {
    const t = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === PREVIEW_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "true");
      setUnlocked(true);
    } else {
      setError("Wrong password. Try again.");
      setPassword("");
    }
  };

  if (unlocked) return children;

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0d0d0d 0%, #1a0a2e 50%, #0d0d0d 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Background glow */}
      <div style={{
        position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: "600px", height: "600px",
        background: "radial-gradient(circle, rgba(134,59,255,0.15) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Logo */}
      <div style={{ marginBottom: "32px", opacity: 0.95 }}>
        <svg width="48" height="46" viewBox="0 0 48 46" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" fill="#863bff"/>
        </svg>
      </div>

      {/* Launch heading */}
      <p style={{
        color: "#863bff",
        fontSize: "0.8rem",
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        marginBottom: "12px",
      }}>
        Launching August 16, 2026
      </p>

      {/* Main title */}
      <h1 style={{
        color: "#ffffff",
        fontSize: "clamp(2.2rem, 6vw, 3.8rem)",
        fontWeight: 800,
        textAlign: "center",
        margin: "0 0 12px",
        lineHeight: 1.1,
        letterSpacing: "-0.02em",
      }}>
        Work & Brew
      </h1>

      <p style={{
        color: "rgba(255,255,255,0.5)",
        fontSize: "1rem",
        textAlign: "center",
        marginBottom: "44px",
        maxWidth: "360px",
        lineHeight: 1.6,
      }}>
        NYC's guide to the best cafés for working, studying, and brewing up ideas.
      </p>

      {/* Countdown */}
      <div style={{
        display: "flex",
        gap: "20px",
        marginBottom: "52px",
      }}>
        {[
          { label: "Days",    value: time.days },
          { label: "Hours",   value: pad(time.hours) },
          { label: "Minutes", value: pad(time.minutes) },
          { label: "Seconds", value: pad(time.seconds) },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{
              background: "rgba(134,59,255,0.12)",
              border: "1px solid rgba(134,59,255,0.25)",
              borderRadius: "12px",
              padding: "14px 18px",
              minWidth: "64px",
              marginBottom: "8px",
            }}>
              <span style={{
                color: "#fff",
                fontSize: "1.8rem",
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                display: "block",
              }}>{value}</span>
            </div>
            <span style={{
              color: "rgba(255,255,255,0.35)",
              fontSize: "0.65rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Password form */}
      <form onSubmit={handleSubmit} style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        maxWidth: "320px",
      }}>
        <p style={{
          color: "rgba(255,255,255,0.35)",
          fontSize: "0.75rem",
          margin: "0 0 4px",
          letterSpacing: "0.05em",
        }}>
          Team preview access
        </p>
        <input
          type="password"
          placeholder="Enter preview password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1.5px solid rgba(134,59,255,0.3)",
            background: "rgba(255,255,255,0.05)",
            color: "#fff",
            fontSize: "0.9rem",
            outline: "none",
            boxSizing: "border-box",
            textAlign: "center",
            letterSpacing: "0.1em",
          }}
        />
        {error && (
          <p style={{ color: "#ff6b6b", fontSize: "0.78rem", margin: 0 }}>{error}</p>
        )}
        <button type="submit" style={{
          width: "100%",
          padding: "12px",
          borderRadius: "10px",
          border: "none",
          background: "#863bff",
          color: "#fff",
          fontSize: "0.9rem",
          fontWeight: 700,
          cursor: "pointer",
          transition: "opacity 0.15s",
        }}
          onMouseOver={(e) => e.target.style.opacity = "0.85"}
          onMouseOut={(e) => e.target.style.opacity = "1"}
        >
          Preview Site →
        </button>
      </form>
    </div>
  );
}
