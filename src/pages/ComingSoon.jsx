import { useState, useEffect } from "react";

const PREVIEW_PASSWORD = "WnB!c0ff33@NYC#2026";
const LAUNCH_DATE = new Date("2026-08-16T00:00:00");
const STORAGE_KEY = "wb_preview_unlocked";

// Color palette
const C = {
  darkBlue:   "#0d1b2a",
  midBlue:    "#1b2d42",
  deepBlue:   "#0a1520",
  brown:      "#3e1f0d",
  brownLight: "#7a3b1e",
  brownAccent:"#a0522d",
  eggshell:   "#f4efe6",
  eggshellDim:"rgba(244,239,230,0.55)",
  eggshellFaint:"rgba(244,239,230,0.18)",
  white:      "#ffffff",
};

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

// Coffee mug SVG icon
function CoffeeMugIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Mug body */}
      <rect x="6" y="18" width="30" height="26" rx="4" fill={C.brownAccent}/>
      {/* Handle */}
      <path d="M36 24 Q46 24 46 31 Q46 38 36 38" stroke={C.brownAccent} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      {/* Steam wisps */}
      <path d="M14 13 Q16 8 14 4" stroke={C.eggshell} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7"/>
      <path d="M21 11 Q23 6 21 2" stroke={C.eggshell} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7"/>
      <path d="M28 13 Q30 8 28 4" stroke={C.eggshell} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7"/>
      {/* Coffee surface highlight */}
      <ellipse cx="21" cy="21" rx="12" ry="3" fill={C.brown} opacity="0.5"/>
    </svg>
  );
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

  if (unlocked || window.location.pathname.startsWith('/ops/')) return children;

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(145deg, ${C.deepBlue} 0%, ${C.darkBlue} 40%, ${C.midBlue} 100%)`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Subtle background glow — brown/warm tone */}
      <div style={{
        position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)",
        width: "700px", height: "500px",
        background: `radial-gradient(ellipse, rgba(160,82,45,0.10) 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Coffee mug icon */}
      <div style={{ marginBottom: "28px", opacity: 0.95 }}>
        <CoffeeMugIcon />
      </div>

      {/* Launch label */}
      <p style={{
        color: C.brownAccent,
        fontSize: "0.78rem",
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        marginBottom: "12px",
      }}>
        Launching August 16, 2026
      </p>

      {/* Main title */}
      <h1 style={{
        color: C.eggshell,
        fontSize: "clamp(2.2rem, 6vw, 3.8rem)",
        fontWeight: 800,
        textAlign: "center",
        margin: "0 0 14px",
        lineHeight: 1.1,
        letterSpacing: "-0.02em",
      }}>
        Work & Brew
      </h1>

      {/* Subtitle */}
      <p style={{
        color: C.eggshellDim,
        fontSize: "1rem",
        textAlign: "center",
        marginBottom: "44px",
        maxWidth: "420px",
        lineHeight: 1.65,
      }}>
        A tool designed and backed up by real new yorkers for new yorkers for productivity with the help of caffeine and cafes — backed up by real research.
      </p>

      {/* Countdown */}
      <div style={{
        display: "flex",
        gap: "16px",
        marginBottom: "52px",
        flexWrap: "wrap",
        justifyContent: "center",
      }}>
        {[
          { label: "Days",    value: time.days },
          { label: "Hours",   value: pad(time.hours) },
          { label: "Minutes", value: pad(time.minutes) },
          { label: "Seconds", value: pad(time.seconds) },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{
              background: C.eggshellFaint,
              border: `1px solid rgba(160,82,45,0.30)`,
              borderRadius: "12px",
              padding: "14px 18px",
              minWidth: "64px",
              marginBottom: "8px",
            }}>
              <span style={{
                color: C.eggshell,
                fontSize: "1.8rem",
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                display: "block",
              }}>{value}</span>
            </div>
            <span style={{
              color: "rgba(244,239,230,0.35)",
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
          color: "rgba(244,239,230,0.35)",
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
            border: `1.5px solid rgba(160,82,45,0.35)`,
            background: "rgba(244,239,230,0.06)",
            color: C.eggshell,
            fontSize: "0.9rem",
            outline: "none",
            boxSizing: "border-box",
            textAlign: "center",
            letterSpacing: "0.1em",
          }}
        />
        {error && (
          <p style={{ color: "#ff8a70", fontSize: "0.78rem", margin: 0 }}>{error}</p>
        )}
        <button type="submit" style={{
          width: "100%",
          padding: "12px",
          borderRadius: "10px",
          border: "none",
          background: C.brownAccent,
          color: C.eggshell,
          fontSize: "0.9rem",
          fontWeight: 700,
          cursor: "pointer",
          transition: "opacity 0.15s",
        }}
          onMouseOver={(e) => e.target.style.opacity = "0.82"}
          onMouseOut={(e) => e.target.style.opacity = "1"}
        >
          Preview Site →
        </button>
      </form>
    </div>
  );
}
