import { useState } from "react";
import Navbar from "../components/Navbar";
import MapComponent from "../components/MapComponent";
import SuggestionForm from "../components/SuggestionForm";
import SiteFooter from "../components/SiteFooter";
import { useSavedCafes } from "../hooks/useSavedCafes";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Home.css";

const CAFE_PHOTOS = {
  "Artizen Cafe":              "/cafes/Website Cafes/Artizen Cafe/IMG_8975.PNG",
  "Avenue Coffee House":       "/cafes/Website Cafes/Avenue Coffee House/IMG_5873.jpg",
  "Burly Coffee BK":           "/cafes/Website Cafes/Burly Coffee BK/IMG_1422.JPG",
  "Full Moon Cafe Queens":     "/cafes/Website Cafes/Full Moon Cafe Queens/IMG_1449.JPG",
  "Koffee BK":                 "/cafes/Website Cafes/Koffee BK/IMG_1434.JPG",
  "PostMark Cafe BK":          "/cafes/Website Cafes/PostMark Cafe BK/IMG_1407.JPG",
  "Savor Coffee and More":     "/cafes/Website Cafes/Savor Coffee and More/IMG_8988.PNG",
  "Stepping Stone Cafe":       "/cafes/Website Cafes/Stepping Stone Cafe/IMG_5685.jpg",
  "The Boogie Down Grind":     "/cafes/Website Cafes/The Boogie Down Grind/IMG_8955.PNG",
};

function CafePhoto({ name }) {
  const src = CAFE_PHOTOS[name];
  if (!src) {
    return (
      <div className="cafe-photo-placeholder">
        <span>📷</span>
        <small>Photo coming soon</small>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`${name} interior`}
      className="cafe-hero-photo"
    />
  );
}

export default function Home() {
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const { user } = useAuth();
  const { saveCafe, removeCafe, isSaved } = useSavedCafes(user?.username);
  const navigate = useNavigate();

  const handleSave = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (isSaved(selectedCafe)) removeCafe(selectedCafe);
    else saveCafe(selectedCafe);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveFilter(search.trim());
  };

  const handleClear = () => {
    setSearch("");
    setActiveFilter("");
  };

  // Safely extracts scout name across any column alias
  const getScoutName = (cafe) => {
    if (!cafe) return "Work & Brew Scout";
    return (
      cafe.ScoutName ||
      cafe.Scout ||
      cafe["Scout Name"] ||
      cafe["Scouted By"] ||
      cafe.ScoutedBy ||
      cafe["Visited By"] ||
      cafe.VisitedBy ||
      cafe.scout_name ||
      cafe.scout ||
      "Work & Brew Scout Team"
    );
  };

  return (
    <div className="home">
      <Navbar />

      <div className={`home-content ${selectedCafe ? "panel-open" : ""}`}>
        <div className="home-main">
          {/* Hero Title */}
          <div className="map-hero">
            <h1 className="map-hero-title">Work &amp; Brew Cafe Map</h1>
            <p className="map-hero-subtitle">
              Our official map made up of all of the small and independent cafes our team has scouted in New York City.
            </p>
          </div>

          {/* Welcome Message */}
          {user && (() => {
            const raw  = user.preferredName || user.username || "Friend";
            const name = raw.charAt(0).toUpperCase() + raw.slice(1);
            return (
              <div className="map-welcome-wrap">
                <p className="map-welcome">Welcome back, <span className="map-welcome-name">{name}</span>! ☕</p>
                <p className="map-welcome-sub">Ready to find your next favourite spot?</p>
              </div>
            );
          })()}

          {/* Search Bar */}
          <div className="search-bar-container">
            <form className="search-bar" onSubmit={handleSearch} role="search">
              <input
                type="text"
                placeholder="Search by zipcode, borough or café name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search cafés"
              />
              {activeFilter && (
                <button type="button" className="search-clear" onClick={handleClear} aria-label="Clear search">
                  ✕
                </button>
              )}
              <button type="submit">Find Cafés ☕</button>
            </form>
          </div>

          {/* Map */}
          <div className="map-container">
            <MapComponent
              onMarkerClick={setSelectedCafe}
              filterQuery={activeFilter}
              panelOpen={!!selectedCafe}
            />
          </div>
        </div>

        {/* Side Panel */}
        {selectedCafe && (
          <div className="slide-over" key={selectedCafe.Name + selectedCafe.Address}>
            <button
              className="slide-over-close"
              onClick={() => setSelectedCafe(null)}
              aria-label="Close café details"
            >
              ✕
            </button>

            <CafePhoto name={selectedCafe.Name} />

            <div className="slide-over-body">
            <h2 className="slide-over-name">{selectedCafe.Name}</h2>
            <p className="slide-over-neighborhood">{selectedCafe.Address?.replace(/, United States$/, ", U.S.")}</p>
            <span className="slide-over-borough-badge">{selectedCafe.County}</span>

            {selectedCafe._locationCount > 1 && (
              <p className="slide-over-locations">
                {selectedCafe._locationCount} locations in NYC
              </p>
            )}

            <div className="slide-over-divider" />

            {/* Amenities Grid */}
            <div className="slide-over-amenities">
              <div className="amenity">
                <span className="amenity-label">WiFi</span>
                <span className="amenity-value">{selectedCafe.WiFi || "—"}</span>
              </div>
              <div className="amenity">
                <span className="amenity-label">Secured</span>
                <span className="amenity-value">
                  {selectedCafe.Secured === "YES" ? "Yes" : selectedCafe.Secured === "NO" ? "No" : selectedCafe.Secured || "—"}
                </span>
              </div>
              <div className="amenity">
                <span className="amenity-label">Outlets</span>
                <span className="amenity-value">
                  {selectedCafe.Outlets === "YES" ? "Yes" : selectedCafe.Outlets === "NO" ? "No" : selectedCafe.Outlets || "—"}
                </span>
              </div>
              <div className="amenity">
                <span className="amenity-label">Hot Food</span>
                <span className="amenity-value">
                  {selectedCafe.HotFood === "YES" ? "Yes" : selectedCafe.HotFood === "NO" ? "No" : selectedCafe.HotFood || "—"}
                </span>
              </div>
              <div className="amenity">
                <span className="amenity-label">Restroom</span>
                <span className="amenity-value">
                  {selectedCafe.Restroom === "YES" ? "Yes" : selectedCafe.Restroom === "NO" ? "No" : selectedCafe.Restroom || "—"}
                </span>
              </div>
              <div className="amenity">
                <span className="amenity-label">Seating</span>
                <span className="amenity-value">{selectedCafe.Seats || "—"}</span>
              </div>
              <div className="amenity">
                <span className="amenity-label">Time Limit</span>
                <span className="amenity-value">
                  {selectedCafe.TimeRestriction === "YES"
                    ? selectedCafe.RestrictionAmount || "Yes"
                    : selectedCafe.TimeRestriction === "NO"
                    ? "None"
                    : selectedCafe.TimeRestriction || "—"}
                </span>
              </div>
            </div>

            <div className="slide-over-divider" />

            {/* About Section */}
            {selectedCafe.Description &&
              selectedCafe.Description !== "TBD - Filler for cafe description and/or summary until reviewed and confirmed with all information up-to-date." && (
                <>
                  <p className="slide-over-section-label">About</p>
                  <p className="slide-over-vibe">{selectedCafe.Description}</p>
                </>
              )}

            {/* Visited By Section */}
            <p className="slide-over-scout">
              Visited by {getScoutName(selectedCafe)}
            </p>
            <div className="slide-over-divider" />

            <a
              className="slide-over-directions"
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedCafe.Address)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              🧭 Get Directions
            </a>

            <button
              className={`slide-over-save ${user && isSaved(selectedCafe) ? "saved" : ""}`}
              onClick={handleSave}
            >
              {user && isSaved(selectedCafe)
                ? "♥ Saved"
                : user
                ? "♡ Save Café"
                : "♡ Log in to save"}
            </button>

            <SuggestionForm cafeName={selectedCafe.Name} />
            </div>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}