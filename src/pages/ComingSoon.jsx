import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import IntroAnimation from "../components/IntroAnimation";

const LAUNCH_DATE = new Date("2026-10-10T12:00:00-04:00");

// Routes that bypass the wall entirely (ops portal, legal pages, login)
const BYPASS_PATHS = ["/login", "/privacy", "/terms", "/sms-privacy", "/sms-terms"];

const C = {
  darkBrown:     "#180A02",
  midBrown:      "#2C1A0E",
  medBrown:      "#5C3D2E",
  eggshell:      "#E0D9CF",
  eggshellDim:   "rgba(224,217,207,0.55)",
  eggshellFaint: "rgba(224,217,207,0.12)",
  brown:         "#a0522d",
  brownLight:    "#c8844a",
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

function CoffeeMugIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="18" width="30" height="26" rx="4" fill={C.brownLight}/>
      <path d="M36 24 Q46 24 46 31 Q46 38 36 38" stroke={C.brownLight} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M14 13 Q16 8 14 4" stroke={C.eggshell} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8"/>
      <path d="M21 11 Q23 6 21 2" stroke={C.eggshell} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8"/>
      <path d="M28 13 Q30 8 28 4" stroke={C.eggshell} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.8"/>
      <ellipse cx="21" cy="21" rx="12" ry="3" fill={C.medBrown} opacity="0.5"/>
    </svg>
  );
}

export default function ComingSoon({ children }) {
  const [time,        setTime]        = useState(getTimeLeft());
  const [authed,      setAuthed]      = useState(null); // null = checking
  const [email,       setEmail]       = useState("");
  const [submitted,   setSubmitted]   = useState(false);
  const [subError,    setSubError]    = useState("");
  const [subLoading,  setSubLoading]  = useState(false);
  const [introDone,   setIntroDone]   = useState(
    () => !!sessionStorage.getItem("wb_intro_seen")
  );

  // Check for existing Supabase session so team members bypass the wall
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data?.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session);
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  // Tick countdown
  useEffect(() => {
    const t = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(t);
  }, []);

  const path = window.location.pathname;
  const isBypass = BYPASS_PATHS.includes(path) || path.startsWith("/ops/");

  // Still checking auth — render nothing briefly to avoid flash
  if (authed === null && !isBypass) return null;

  // Team member is logged in, or it's a bypass route — show the real site
  if (authed || isBypass) return children;

  // Show intro animation on first visit this session
  if (!introDone) {
    return (
      <IntroAnimation onDone={() => {
        sessionStorage.setItem("wb_intro_seen", "1");
        setIntroDone(true);
      }} />
    );
  }

  // Everyone else sees the coming soon wall
  const pad = (n) => String(n).padStart(2, "0");

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSubError("");
    setSubLoading(true);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Something went wrong.");
      setSubmitted(true);
    } catch (err) {
      setSubError(err.message || "Couldn't sign you up. Try again.");
    }
    setSubLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(145deg, ${C.darkBrown} 0%, ${C.midBrown} 50%, ${C.medBrown} 100%)`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>

      <div style={{
        position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)",
        width: "700px", height: "500px",
        background: `radial-gradient(ellipse, rgba(200,132,74,0.08) 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{ marginBottom: "28px", opacity: 0.95 }}>
        <CoffeeMugIcon />
      </div>

      <p style={{
        color: C.brownLight,
        fontSize: "0.78rem",
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        marginBottom: "12px",
      }}>
        Launching October 10, 2026 at 12:00 PM EST
      </p>

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

      <p style={{
        color: C.eggshellDim,
        fontSize: "1rem",
        textAlign: "center",
        marginBottom: "44px",
        maxWidth: "420px",
        lineHeight: 1.65,
      }}>
        A tool designed and backed up by real New Yorkers, for New Yorkers — for productivity with the help of caffeine and cafes. Backed up by real research.
      </p>

      {/* Countdown */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "52px", flexWrap: "wrap", justifyContent: "center" }}>
        {[
          { label: "Days",    value: time.days },
          { label: "Hours",   value: pad(time.hours) },
          { label: "Minutes", value: pad(time.minutes) },
          { label: "Seconds", value: pad(time.seconds) },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{
              background: C.eggshellFaint,
              border: `1px solid rgba(160,82,45,0.25)`,
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
              color: "rgba(224,217,207,0.35)",
              fontSize: "0.65rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Email sign-up */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%", maxWidth: "340px" }}>
        <p style={{ color: "rgba(224,217,207,0.45)", fontSize: "0.78rem", margin: "0 0 2px", letterSpacing: "0.06em", textAlign: "center" }}>
          Be the first to know — website launch &amp; app updates
        </p>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <p style={{ color: C.eggshell, fontWeight: 700, fontSize: "1rem", marginBottom: "4px" }}>You're on the list ☕</p>
            <p style={{ color: C.eggshellDim, fontSize: "0.82rem" }}>We'll reach out when we go live.</p>
          </div>
        ) : (
          <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                border: `1.5px solid rgba(160,82,45,0.35)`,
                background: "rgba(224,217,207,0.07)",
                color: C.eggshell,
                fontSize: "0.9rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {subError && (
              <p style={{ color: "#ff8a70", fontSize: "0.78rem", margin: 0 }}>{subError}</p>
            )}
            <button
              type="submit"
              disabled={subLoading}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "10px",
                border: "none",
                background: C.brownLight,
                color: C.darkBrown,
                fontSize: "0.92rem",
                fontWeight: 700,
                cursor: subLoading ? "not-allowed" : "pointer",
                opacity: subLoading ? 0.7 : 1,
                letterSpacing: "0.04em",
                transition: "background 0.15s, color 0.15s",
              }}
            onMouseOver={(e) => { if (!subLoading) { e.currentTarget.style.background = "#E0D9CF"; e.currentTarget.style.color = C.darkBrown; }}}
            onMouseOut={(e) => { e.currentTarget.style.background = C.brownLight; e.currentTarget.style.color = C.darkBrown; }}
            onMouseDown={(e) => { e.currentTarget.style.background = "#f4efe6"; }}
            onMouseUp={(e) => { e.currentTarget.style.background = "#E0D9CF"; }}
            >
              {subLoading ? "Adding you…" : "Sign Up for Early Access →"}
            </button>
          </form>
        )}

        <button
          onClick={() => window.location.href = "/login"}
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(224,217,207,0.28)",
            fontSize: "0.78rem",
            cursor: "pointer",
            letterSpacing: "0.04em",
            padding: "4px",
            marginTop: "4px",
          }}
          onMouseOver={(e) => e.target.style.color = "rgba(224,217,207,0.5)"}
          onMouseOut={(e) => e.target.style.color = "rgba(224,217,207,0.28)"}
        >
          Team member? Log in
        </button>
      </div>
    </div>
  );
}
