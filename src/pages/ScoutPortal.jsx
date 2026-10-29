import { Link, useParams, useLocation } from "react-router-dom";
import NotFound from "./NotFound";
import { useAuth } from "../context/AuthContext";
import { useTeamAccess } from "../hooks/useTeamAccess";
import Navbar from "../components/Navbar";

// The scout map is for the 9 team members only (team_access table, checked on the server).
// workandbrew.app/ops/teambrew26 — the map itself and its data are locked to the same list.
const SCOUT_SECRET = "teambrew26";

const box = {
  minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center",
  background: "#EDE5D8", color: "#2C1A0E", fontFamily: "Inter, system-ui, sans-serif",
};
const btn = {
  display: "inline-block", marginTop: 16, padding: "11px 18px", borderRadius: 10, background: "#2C1A0E",
  color: "#F2ECE3", fontWeight: 700, textDecoration: "none",
};

export default function ScoutPortal() {
  const { key } = useParams();
  const { search, pathname } = useLocation(); // pass ?suggestions=1&row=3 or ?review=... on to the map
  const { user } = useAuth();
  const access = useTeamAccess(user);

  if (key !== SCOUT_SECRET) return <NotFound />;
  if (!user) {
    return (
      <div style={box}><div>
        <h1 style={{ fontFamily: "Newsreader, Georgia, serif" }}>Café Map</h1>
        <p>For Work &amp; Brew team members. Please log in first.</p>
        <Link style={btn} to={`/login?next=${encodeURIComponent(pathname + search)}`}>Log in</Link>
      </div></div>
    );
  }
  if (!access.map) {
    return (
      <div style={box}><div>
        <h1 style={{ fontFamily: "Newsreader, Georgia, serif" }}>Café Map</h1>
        <p>Checking your team access… If this doesn&apos;t open, your email isn&apos;t on the team list yet.</p>
        <Link style={btn} to="/">Back to the site</Link>
      </div></div>
    );
  }

  // The site navbar stays on top (80px) so the team can hop to any page without retyping the URL.
  return (
    <>
      <Navbar />
      <iframe
        src={"/scout-map.html" + search}
        title="Work & Brew Scout Portal"
        style={{
          position: "fixed",
          top: "var(--nav-h, 80px)",
          left: 0,
          width: "100vw",
          height: "calc(100dvh - var(--nav-h, 80px))",
          border: "none",
          zIndex: 10,
        }}
      />
    </>
  );
}
