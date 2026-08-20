import { useState } from "react";
import Navbar from "../components/Navbar";
import MapComponent from "../components/MapComponent";
import SuggestionForm from "../components/SuggestionForm";
import { useSavedCafes } from "../hooks/useSavedCafes";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Home.css";

const CAFE_IMAGES = {
  "Mottley Kitchen": ["/cafe-images/mottley-kitchen.avif", null, null],
};

function CafePhotoCarousel({ photos }) {
  const [idx, setIdx] = useState(0);
  const slots = photos && photos.length ? photos : [null, null, null];
  const total = slots.length;
  const prev = () => setIdx((idx - 1 + total) % total);
  const next = () => setIdx((idx + 1) % total);

  return (
    <div className="cafe-carousel">
      <div className="cafe-carousel-frame">
        {slots[idx] ? (
          <img
            src={slots[idx]}
            alt={`Café photo ${idx + 1}`}
            className="cafe-carousel-img"
          />
        ) : (
          <div className="cafe-photo-placeholder">
            <span>📷</span>
            <small>Photo {idx + 1} coming soon</small>
          </div>
        )}
        <button className="cafe-carousel-arrow cafe-carousel-arrow--left" onClick={prev} aria-label="Previous photo">‹</button>
        <button className="cafe-carousel-arrow cafe-carousel-arrow--right" onClick={next} aria-label="Next photo">›</button>
        <span className="cafe-carousel-counter">{idx + 1} / {total}</span>
      </div>
      <div className="cafe-carousel-dots">
        {slots.map((_, i) => (
          <button
            key={i}
            className={`cafe-carousel-dot${i === idx ? " active" : ""}`}
            onClick={() => setIdx(i)}
            aria-label={`Go to photo ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [boroughFilter, setBoroughFilter] = useState("");
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

  // Helper to format stats: removes checkmarks & capitalizes first letter only (e.g. Yes, No, Many, Ample)
  const formatStat = (val) => {
    if (!val || val === "—" || val === "NONE" || val === "none") return "—";
    const str = String(val).trim();
    if (str.toUpperCase() === "TRUE" || str.toUpperCase() === "YES") return "Yes";
    if (str.toUpperCase() === "FALSE" || str.toUpperCase() === "NO") return "No";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const isTrue = (val) => String(val).toUpperCase() === "TRUE" || String(val).toUpperCase() === "YES";

  return (
    <div className="home">
      <Navbar />

      <div className={`home-content ${selectedCafe ? "panel-open" : ""}`}>
        <div className="home-main">
          <div className="map-hero">
            <h1 className="map-hero-title">Work & Brew Cafe Map</h1>
            <p className="map-hero-subtitle">
              Our official map made up of all of the small and independent cafes our team has scouted in New York City.
            </p>
          </div>

          {user && (() => {
            const raw = user.preferredName || user.username || "Friend";
            const name = raw.charAt(0).toUpperCase() + raw.slice(1);
            return (
              <div className="map-welcome-wrap">
                <p className="map-welcome">Welcome back, <span className="map-welcome-name">{name}</span>! ☕</p>
                <p className="map-welcome-sub">Ready to find your next favourite spot?</p>
              </div>
            );
          })()}

          <div className="search-bar-container">
            <form className="search-bar" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search by zipcode, borough or café name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {activeFilter && (
                <button type="button" className="search-clear" onClick={handleClear}>
                  ✕
                </button>
              )}
              <button type="submit">Find Cafés ☕</button>
            </form>
          </div>

          {/* Map with Seating Key (top-left) & Borough Filter (top-right) */}
          <div className="map-container">
            <div className="map-overlay-key">
              <span className="key-label">🪑 Seating Key:</span>
              <span className="key-badge">Few (0–4)</span>
              <span className="key-badge">Some (4–8)</span>
              <span className="key-badge">Many (8–12)</span>
              <span className="key-badge">Ample (12+)</span>
            </div>

            <div className="map-overlay-filter">
              <select
                className="map-filter-select"
                value={boroughFilter}
                onChange={(e) => setBoroughFilter(e.target.value)}
                aria-label="Filter by borough"
              >
                <option value="">All Boroughs ▾</option>
                <option value="Manhattan">Manhattan</option>
                <option value="Brooklyn">Brooklyn</option>
                <option value="Queens">Queens</option>
                <option value="Bronx">Bronx</option>
                <option value="Staten Island">Staten Island</option>
              </select>
            </div>

            <MapComponent
              onMarkerClick={setSelectedCafe}
              filterQuery={activeFilter}
              boroughFilter={boroughFilter}
              panelOpen={!!selectedCafe}
            />
          </div>
        </div>

        {selectedCafe && (
          <div className="slide-over" key={selectedCafe.Name + selectedCafe.Address}>
            <button className="slide-over-close" onClick={() => setSelectedCafe(null)}>
              ✕
            </button>

            <CafePhotoCarousel
              photos={CAFE_IMAGES[selectedCafe.Name] || [null, null, null]}
            />

            {/* Centered Title & Location */}
            <div className="slide-over-header-centered">
              <h2 className="slide-over-name">{selectedCafe.Name}</h2>
              <p className="slide-over-neighborhood">{selectedCafe.Address}</p>
              <span className="slide-over-borough-badge">{selectedCafe.County}</span>

              {selectedCafe._locationCount > 1 && (
                <p className="slide-over-locations">
                  {selectedCafe._locationCount} locations in NYC
                </p>
              )}
            </div>

            <div className="slide-over-divider" />

            {/* Amenities Grid */}
            <div className="slide-over-amenities">
              <div className="amenity">
                <span className="amenity-label">WiFi</span>
                <span className="amenity-value">
                  {formatStat(selectedCafe.WiFi || selectedCafe["Wi-fi"] || "Yes")}
                </span>
              </div>
              <div className="amenity">
                <span className="amenity-label">Outlets</span>
                <span className="amenity-value">
                  {formatStat(selectedCafe.Outlets)}
                </span>
              </div>
              <div className="amenity">
                <span className="amenity-label">Hot Food</span>
                <span className="amenity-value">
                  {formatStat(selectedCafe.HotFood)}
                </span>
              </div>
              <div className="amenity">
                <span className="amenity-label">Restroom</span>
                <span className="amenity-value">
                  {formatStat(selectedCafe.Restroom)}
                </span>
              </div>
              <div className="amenity">
                <span className="amenity-label">Seating</span>
                <span className="amenity-value">
                  {(() => {
                    const s = parseInt(selectedCafe.Seats);
                    if (!isNaN(s)) {
                      if (s <= 4) return `Few (${s})`;
                      if (s <= 8) return `Some (${s})`;
                      if (s <= 12) return `Many (${s})`;
                      return `Ample (${s})`;
                    }
                    return formatStat(selectedCafe.Seats) || "—";
                  })()}
                </span>
              </div>
              <div className="amenity">
                <span className="amenity-label">Time Limit</span>
                <span className="amenity-value">
                  {isTrue(selectedCafe.TimeRestriction || selectedCafe.Restrictions)
                    ? formatStat(selectedCafe.RestrictionAmount || selectedCafe.RestrictionInfo || "Yes")
                    : "None"}
                </span>
              </div>
            </div>

            {selectedCafe.Description && (
              <>
                <div className="slide-over-divider" />
                <p className="slide-over-section-label">About</p>
                <p className="slide-over-vibe">{selectedCafe.Description}</p>
              </>
            )}

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
                ? "🤍 Saved"
                : user
                ? "🤍 Save Café"
                : "🤍 Log in to save"}
            </button>

            <SuggestionForm cafeName={selectedCafe.Name} />

            {/* Centered Visited by Scout at bottom */}
            <div className="slide-over-visited-centered">
              Visited by <strong>{selectedCafe.ScoutName || selectedCafe.VisitedBy || "Work & Brew Team"}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}