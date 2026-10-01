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
  { date: "Oct 2, 2026", label: "Website Goes Live" },
  { date: "Nov 16, 2026", label: "RSVP Deadline" },
  { date: "Nov 22, 2026", label: "Social No. 001 + App Launch" },
];

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
