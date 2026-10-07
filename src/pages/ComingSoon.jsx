import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import IntroAnimation from "../components/IntroAnimation";

const LAUNCH_DATE = new Date("2026-10-10T12:00:00-04:00");

const BYPASS_PATHS = ["/login", "/privacy", "/terms", "/sms-privacy", "/sms-terms"];

/* ── Palette ────────────────────────────────────────────────── */
const C = {
  bg:           "#F2ECE3",   // warm off-white / eggshell
  bgCard:       "#EDE5D8",   // slightly deeper cream for cards / boxes
  border:       "#D4C4A8",   // warm beige border
  darkBrown:    "#1C0A02",   // near-black brown — primary text
  midBrown:     "#3D1F0D",   // secondary text
  mutedBrown:   "#7A4C2E",   // muted / caption text
  orange:       "#C85A1E",   // burnt autumn orange — primary accent
  orangeLight:  "#E07840",   // hover / lighter orange
  orangeFaint:  "rgba(200,90,30,0.12)", // subtle tint
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
    <svg width="48" height="48" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="18" width="30" height="26" rx="4" fill={C.orange}/>
      <path d="M36 24 Q46 24 46 31 Q46 38 36 38" stroke={C.orange} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M14 13 Q16 8 14 4" stroke={C.midBrown} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5"/>
      <path d="M21 11 Q23 6 21 2" stroke={C.midBrown} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5"/>
      <path d="M28 13 Q30 8 28 4" stroke={C.midBrown} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5"/>
      <ellipse cx="21" cy="21" rx="12" ry="3" fill={C.midBrown} opacity="0.25"/>
    </svg>
  );
}

export default function ComingSoon({ children }) {
  const [time,       setTime]       = useState(getTimeLeft());
  const [authed,     setAuthed]     = useState(null);
  const [email,      setEmail]      = useState("");
  const [submitted,  setSubmitted]  = useState(false);
  const [subError,   setSubError]   = useState("");
  const [subLoading, setSubLoading] = useState(false);
  const [introDone,  setIntroDone]  = useState(() => {
    try { return !!sessionStorage.getItem("wb_intro_seen"); } catch { return false; }
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data?.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session));
    return () => listener?.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(t);
  }, []);

  const path = window.location.pathname;
  const isBypass = BYPASS_PATHS.includes(path) || path.startsWith("/ops/");

  if (authed === null && !isBypass) return null;
  if (authed || isBypass) return children;

  const pad = (n) => String(n).padStart(2, "0");

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSubError("");
    setSubLoading(true);
    try {
      const res  = await fetch("/api/subscribe", {
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

  /* ── Wall page (always rendered so the fade-out reveals it) ── */
  const wallPage = (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      padding: "32px 24px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Subtle background texture ring */}
      <div style={{
        position: "absolute",
        top: "5%", left: "50%", transform: "translateX(-50%)",
        width: "min(700px, 90vw)", height: "500px",
        background: `radial-gradient(ellipse, ${C.orangeFaint} 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Mug */}
      <div style={{ marginBottom: "20px", opacity: 0.9 }}>
        <CoffeeMugIcon />
      </div>

      {/* Eyebrow */}
      <p style={{
        color: C.orange,
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        marginBottom: "10px",
      }}>
        Launching October 10, 2026 · 12 PM EST
      </p>

      {/* Title */}
      <h1 style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        color: C.darkBrown,
        fontSize: "clamp(2.6rem, 7vw, 5rem)",
        fontWeight: 900,
        textAlign: "center",
        margin: "0 0 10px",
        lineHeight: 1.05,
        letterSpacing: "-0.01em",
      }}>
        Work & Brew
      </h1>

      {/* Tagline */}
      <p style={{
        color: C.mutedBrown,
        fontSize: "clamp(0.85rem, 2vw, 1rem)",
        textAlign: "center",
        marginBottom: "40px",
        maxWidth: "400px",
        lineHeight: 1.65,
      }}>
        A tool designed and backed by real New Yorkers, for New Yorkers —
        for productivity with the help of caffeine and cafés.
      </p>

      {/* Countdown */}
      <div style={{
        display: "flex", gap: "12px", marginBottom: "48px",
        flexWrap: "wrap", justifyContent: "center",
      }}>
        {[
          { label: "Days",    value: time.days },
          { label: "Hours",   value: pad(time.hours) },
          { label: "Minutes", value: pad(time.minutes) },
          { label: "Seconds", value: pad(time.seconds) },
        ].map(({ label, value }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{
              background: C.bgCard,
              border: `1.5px solid ${C.border}`,
              borderRadius: "12px",
              padding: "14px 20px",
              minWidth: "68px",
              marginBottom: "6px",
              boxShadow: "0 2px 8px rgba(60,20,5,0.07)",
            }}>
              <span style={{
                color: C.darkBrown,
                fontSize: "1.9rem",
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
                display: "block",
                fontFamily: "'Playfair Display', Georgia, serif",
              }}>{value}</span>
            </div>
            <span style={{
              color: C.mutedBrown,
              fontSize: "0.62rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{
        width: "40px", height: "2px",
        background: C.orange, borderRadius: "2px",
        marginBottom: "28px", opacity: 0.7,
      }} />

      {/* Email sign-up */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "8px", width: "100%", maxWidth: "340px",
      }}>
        <p style={{
          color: C.mutedBrown, fontSize: "0.76rem",
          margin: "0 0 4px", letterSpacing: "0.04em", textAlign: "center",
        }}>
          Be first to know — website launch &amp; app updates
        </p>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "14px 0" }}>
            <p style={{ color: C.darkBrown, fontWeight: 800, fontSize: "1rem", marginBottom: "4px" }}>
              You're on the list ☕
            </p>
            <p style={{ color: C.mutedBrown, fontSize: "0.82rem" }}>
              We'll reach out when we go live.
            </p>
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
                border: `1.5px solid ${C.border}`,
                background: "#fff",
                color: C.darkBrown,
                fontSize: "0.9rem",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
            {subError && (
              <p style={{ color: "#C0392B", fontSize: "0.78rem", margin: 0 }}>{subError}</p>
            )}
            <button
              type="submit"
              disabled={subLoading}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: "10px",
                border: "none",
                background: C.orange,
                color: "#fff",
                fontSize: "0.92rem",
                fontWeight: 700,
                cursor: subLoading ? "not-allowed" : "pointer",
                opacity: subLoading ? 0.7 : 1,
                letterSpacing: "0.04em",
                fontFamily: "inherit",
                transition: "background 0.15s",
              }}
              onMouseOver={(e) => { if (!subLoading) e.currentTarget.style.background = C.orangeLight; }}
              onMouseOut={(e) => { e.currentTarget.style.background = C.orange; }}
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
            color: C.border,
            fontSize: "0.75rem",
            cursor: "pointer",
            letterSpacing: "0.04em",
            padding: "4px",
            marginTop: "6px",
            fontFamily: "inherit",
            transition: "color 0.15s",
          }}
          onMouseOver={(e) => e.target.style.color = C.mutedBrown}
          onMouseOut={(e) => e.target.style.color = C.border}
        >
          Team member? Log in
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Landing page always present so the animation fades to reveal it */}
      {wallPage}

      {/* Intro animation sits on top; fades out to show page underneath */}
      {!introDone && (
        <IntroAnimation onDone={() => {
          try { sessionStorage.setItem("wb_intro_seen", "1"); } catch { /* privacy mode */ }
          setIntroDone(true);
        }} />
      )}
    </>
  );
}
