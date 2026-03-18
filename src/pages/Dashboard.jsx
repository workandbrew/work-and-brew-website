import Navbar from "../components/Navbar";
import "./PageShared.css";

// Placeholder saved cafés — will pull from Supabase once auth is wired up
const SAVED_CAFES = [
  { id: 1, name: "Kofee", neighborhood: "Inwood, Manhattan", tag: "Small Business ⭐" },
  { id: 2, name: "The Bronx Bean", neighborhood: "Fordham, Bronx", tag: "Small Business ⭐" },
];

export default function Dashboard() {
  return (
    <div className="page-shell">
      <Navbar />
      <div className="page-content">
        <div className="page-badge">My Dashboard</div>
        <h1 className="page-title">Your saved cafés ☕</h1>

        {SAVED_CAFES.length === 0 ? (
          <p className="page-body">
            You haven't saved any cafés yet. Go explore the map!
          </p>
        ) : (
          <div className="saved-cafes-grid">
            {SAVED_CAFES.map((cafe) => (
              <div key={cafe.id} className="saved-cafe-card">
                <div className="saved-cafe-tag">{cafe.tag}</div>
                <p className="saved-cafe-name">{cafe.name}</p>
                <p className="saved-cafe-neighborhood">{cafe.neighborhood}</p>
                <button className="saved-cafe-remove">Remove ✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Profile Settings Placeholder */}
        <div className="page-section-label" style={{ marginTop: "2.5rem" }}>
          Account Settings
        </div>
        <div className="settings-placeholder">
          Profile settings will live here once Supabase auth is connected.
        </div>
      </div>
    </div>
  );
}
