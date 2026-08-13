import { useState } from "react";
import "./MyCafesGuide.css";

const GUIDE_KEY = (uid) => `wb_guide_mycafes_${uid}`;

const STEPS = [
  {
    num: "01",
    icon: "🗺️",
    title: "Find your favourite spots",
    body: "Head to the café map, tap any pin that catches your eye, and hit ♡ Save Café. It lands in your list instantly — no extra steps.",
  },
  {
    num: "02",
    icon: "☕",
    title: "They live right here",
    body: "Every café you save shows up in My Cafés, neatly organised in your personal list. Always there when you need them.",
  },
  {
    num: "03",
    icon: "📍",
    title: "Your own NYC café map",
    body: "Your saves also appear on your personal map below — a live, custom view of all your favourite spots scattered across the city.",
  },
  {
    num: "04",
    icon: "📝",
    title: "Leave yourself a note",
    body: "Each café in your list has a personal note field just for you. Jot down the wifi speed, your go-to order, or a quick vibe check — totally private, only you can see it.",
  },
];

export default function MyCafesGuide({ username, permission, onGrant, onDeny }) {
  // ── Determine whether the guide should be shown at all ──────────────────────
  const guideSeen   = username ? !!localStorage.getItem(GUIDE_KEY(username)) : true;
  const shouldShow  = !!username && (
    permission === null ||                         // never answered → show perm slide
    (permission === "granted" && !guideSeen)       // granted but steps not yet seen
  );

  const [visible,  setVisible]  = useState(shouldShow);
  const [slide,    setSlide]    = useState(permission === null ? "perm" : 0);
  const [leaving,  setLeaving]  = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => {
      setVisible(false);
      if (username) localStorage.setItem(GUIDE_KEY(username), "1");
    }, 320);
  };

  const handleGrant = () => {
    onGrant?.();
    setSlide(0); // advance to feature steps
  };

  const handleDeny = () => {
    onDeny?.();
    setLeaving(true);
    setTimeout(() => setVisible(false), 320);
  };

  const next = () => {
    if (typeof slide !== "number") return;
    if (slide < STEPS.length - 1) setSlide((s) => s + 1);
    else dismiss();
  };

  const prev = () => {
    if (typeof slide === "number" && slide > 0) setSlide((s) => s - 1);
  };

  if (!visible) return null;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={`mcg-overlay ${leaving ? "mcg-overlay--out" : ""}`}>
      <div className={`mcg-card ${leaving ? "mcg-card--out" : ""}`}>

        {/* ── PERMISSION INTRO SLIDE ─────────────────────────────────────── */}
        {slide === "perm" && (
          <>
            <div className="mcg-topbar">
              <span className="mcg-badge">Welcome to My Cafés ☕</span>
            </div>

            <div className="mcg-perm-icon">☕</div>
            <h2 className="mcg-heading">We're so glad you're here!</h2>

            <p className="mcg-perm-intro">
              My Cafés is your personal space — your saved spots, your notes,
              your own little corner of Work &amp; Brew. To make that happen, we'd
              love your permission to save a small bit of data on your device.
              Here's exactly what that includes, because you deserve to know:
            </p>

            <ul className="mcg-perm-list">
              <li><span className="mcg-perm-check">✓</span> Your saved café list</li>
              <li><span className="mcg-perm-check">✓</span> Your personal notes per café</li>
              <li><span className="mcg-perm-check">✓</span> Your account preferences</li>
            </ul>

            <p className="mcg-perm-note">
              Genuinely, that's it — nothing else, nothing ever shared. And if
              you'd rather just explore the map without saving anything, you are
              absolutely welcome to. No pressure, no judgment. We're just happy
              you're here. ☕
            </p>

            <div className="mcg-actions mcg-actions--perm">
              <button className="mcg-btn mcg-btn--ghost" onClick={handleDeny}>
                No thanks
              </button>
              <button className="mcg-btn mcg-btn--primary" onClick={handleGrant}>
                I agree, let's go →
              </button>
            </div>
          </>
        )}

        {/* ── FEATURE STEP SLIDES ────────────────────────────────────────── */}
        {typeof slide === "number" && (
          <>
            <div className="mcg-topbar">
              <span className="mcg-badge">Quick Guide</span>
              <button className="mcg-close" onClick={dismiss} aria-label="Close guide">✕</button>
            </div>

            <h2 className="mcg-heading">How My Cafés works ☕</h2>
            <p className="mcg-sub">Your personal space for saving and revisiting the best spots in NYC.</p>

            {/* Step panel */}
            <div className="mcg-panel" key={slide}>
              <div className="mcg-panel-left">
                <span className="mcg-step-num">{STEPS[slide].num}</span>
                <div className="mcg-connector" />
              </div>
              <div className="mcg-panel-right">
                <span className="mcg-icon">{STEPS[slide].icon}</span>
                <h3 className="mcg-step-title">{STEPS[slide].title}</h3>
                <p className="mcg-step-body">{STEPS[slide].body}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="mcg-progress-track">
              <div
                className="mcg-progress-fill"
                style={{ width: `${((slide + 1) / STEPS.length) * 100}%` }}
              />
            </div>
            <p className="mcg-progress-label">{slide + 1} of {STEPS.length}</p>

            {/* Nav */}
            <div className="mcg-actions">
              {slide > 0
                ? <button className="mcg-btn mcg-btn--ghost" onClick={prev}>← Back</button>
                : <button className="mcg-btn mcg-btn--ghost" onClick={dismiss}>Skip for now</button>
              }
              <button className="mcg-btn mcg-btn--primary" onClick={next}>
                {slide < STEPS.length - 1 ? "Next →" : "Let's go ☕"}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
