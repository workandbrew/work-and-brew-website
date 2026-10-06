import { useState } from "react";
import Navbar from "../components/Navbar";
import SiteFooter from "../components/SiteFooter";
import "./PageShared.css";
import "./Event.css";

const PARTIFUL_LINK = "https://partiful.com/e/cPYbb7XjXOWAduEq2w4T";

const INCLUSIONS = [
  {
    emoji: "☕",
    title: "Signature Drink & Pastry",
    desc: "Walk in and grab your choice of a housemade signature drink and fresh pastry — ALL drinks topped with our thick rich cold foam. Curated by Work & Brew team members (ex-culinary chefs).",
  },
  {
    emoji: "📍",
    title: "WFH Cafe Hookups",
    desc: "Stay upstairs for 1–2 personalized, work-friendly cafe recommendations tailored to your neighborhood by the team — straight from our verified cafe database.",
  },
  {
    emoji: "🎨",
    title: "Craft Time",
    desc: "Score an exclusive postcard designed by our independent, 100% AI-free artist, Iris. Head to the coloring station and make a cute keepsake. Calling all scrapbooking girlies and crafty souls!",
  },
  {
    emoji: "🎮",
    title: "Game & Mingle",
    desc: "Head downstairs for a cozy Sunday hangout — break the ice, meet cool people, and play Jackbox, Kahoot, We're Not Really Strangers, and giant Uno.",
  },
];

const KEY_DATES = [
  { date: "Oct 10, 2026", label: "Website Goes Live" },
  { date: "Nov 16, 2026", label: "RSVP Deadline" },
  { date: "Nov 22, 2026", label: "Social No. 001 + App Launch" },
];

// ── Calendar ──────────────────────────────────────────────────────────────────

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const WEEKDAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

// Add future events here: key = "YYYY-MM-DD"
const CAL_EVENTS = {
  "2026-11-22": "Work & Brew Social No. 001",
};

function EventCalendar() {
  const [year, setYear]   = useState(2026);
  const [month, setMonth] = useState(10); // November = index 10

  const now      = new Date();
  const isAtMin  = year === now.getFullYear() && month === now.getMonth();
  const isAtMax  = year === 2027 && month === 11;

  function prevMonth() {
    if (isAtMin) return;
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (isAtMax) return;
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  // Mon-start offset
  const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sun
  const startOffset  = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const daysInMonth  = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const dateKey = (d) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const isToday = (d) =>
    d &&
    year  === now.getFullYear() &&
    month === now.getMonth() &&
    d     === now.getDate();

  return (
    <div className="event-cal">
      <div className="event-cal-header">
        <button
          className="event-cal-nav"
          onClick={prevMonth}
          disabled={isAtMin}
          aria-label="Previous month"
        >‹</button>
        <span className="event-cal-title">{MONTHS[month]} {year}</span>
        <button
          className="event-cal-nav"
          onClick={nextMonth}
          disabled={isAtMax}
          aria-label="Next month"
        >›</button>
      </div>

      <div className="event-cal-grid">
        {WEEKDAYS.map(d => (
          <div key={d} className="event-cal-dayname">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} className="event-cal-cell event-cal-pad" />;
          const key  = dateKey(day);
          const evt  = CAL_EVENTS[key];
          const tod  = isToday(day);
          return (
            <div
              key={key}
              className={[
                "event-cal-cell",
                evt ? "event-cal-marked" : "",
                tod ? "event-cal-today" : "",
              ].join(" ").trim()}
            >
              <span className="event-cal-num">{day}</span>
              {evt && <span className="event-cal-evtlbl">{evt}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Event() {
  return (
    <div className="page-shell">
      <Navbar />

      <div className="event-page">

        {/* Hero */}
        <div className="event-hero">
          <div className="page-badge">Live Event</div>
          <h1 className="event-title">Work &amp; Brew<br />Social No. 001</h1>
          <p className="event-subtitle">
            Our very first public pop-up — celebrating the launch of the Work &amp; Brew app
            and giving back with a charity drive for{" "}
            <a href="https://www.nyrr.org/team-for-kids" target="_blank" rel="noopener noreferrer" className="event-link">
              NYRR Team for Kids
            </a>{" "}
            before the NYC Marathon.
          </p>

          <div className="event-meta-row">
            <div className="event-meta-pill">📅 Sunday, November 22, 2026</div>
            <div className="event-meta-pill">⏰ 12:00 PM ET</div>
            <div className="event-meta-pill">🎟 $22 per person</div>
            <div className="event-meta-pill">📍 New York City</div>
          </div>

          <a href={PARTIFUL_LINK} target="_blank" rel="noopener noreferrer" className="event-cta-btn">
            RSVP on Partiful →
          </a>
          <p className="event-rsvp-note">RSVP by Monday, Nov 16th · Limited to 100 spots</p>
        </div>

        {/* Scrollable Event Calendar */}
        <div className="event-section">
          <h2 className="event-section-title">Upcoming Events</h2>
          <EventCalendar />
        </div>

        {/* What's Included */}
        <div className="event-section">
          <h2 className="event-section-title">Your Ticket Includes</h2>
          <div className="event-inclusions">
            {INCLUSIONS.map((item) => (
              <div key={item.title} className="event-inclusion-card">
                <div className="event-inclusion-emoji">{item.emoji}</div>
                <h3 className="event-inclusion-title">{item.title}</h3>
                <p className="event-inclusion-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Key Dates */}
        <div className="event-section event-section--dates">
          <h2 className="event-section-title">Key Dates</h2>
          <div className="event-dates-row">
            {KEY_DATES.map((d, i) => (
              <div key={i} className="event-date-block">
                <div className="event-date-value">{d.date}</div>
                <div className="event-date-label">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* App Launch callout */}
        <div className="event-section">
          <div className="event-app-callout">
            <div className="event-app-callout-inner">
              <p className="event-app-eyebrow">Coming November 22, 2026</p>
              <h2 className="event-app-title">Work &amp; Brew App — Launching on<br />App Store &amp; Google Play</h2>
              <p className="event-app-desc">
                Join us at Social No. 001 the same day the app drops across all platforms.
                Be among the first to use it live, in the room where it all started.
              </p>
              <a href={PARTIFUL_LINK} target="_blank" rel="noopener noreferrer" className="event-cta-btn event-cta-btn--dark">
                Get Your Ticket →
              </a>
            </div>
          </div>
        </div>

        {/* Charity */}
        <div className="event-section event-section--charity">
          <h2 className="event-section-title">Giving Back</h2>
          <p className="event-charity-text">
            A portion of ticket proceeds goes to{" "}
            <a href="https://www.nyrr.org/team-for-kids" target="_blank" rel="noopener noreferrer" className="event-link">
              NYRR Team for Kids
            </a>
            , a charity that gets youth moving and racing across NYC — perfectly timed
            before the NYC Marathon. Come celebrate with us and support something real.
          </p>
        </div>

        {/* Bottom CTA */}
        <div className="event-bottom-cta">
          <p className="event-bottom-text">Only 100 spots. RSVP before Nov 16th.</p>
          <a href={PARTIFUL_LINK} target="_blank" rel="noopener noreferrer" className="event-cta-btn">
            Grab Your Spot on Partiful →
          </a>
        </div>

      </div>

      <SiteFooter />
    </div>
  );
}
