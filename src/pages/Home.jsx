import { useState } from "react";
import Navbar from "../components/Navbar";
import "./Home.css";

// Placeholder café data for now.
const PLACEHOLDER_CAFES = [
  {
    id: 1,
    name: "Kofee",
    neighborhood: "Inwood, Manhattan",
    wifi: "Secured (WPA)",
    outlets: "Yes",
    noise: "Low",
    seats: 24,
    food: "Yes",
    bathroom: "Yes",
    hours: "7am – 8pm",
    vibe: "A hidden gem in Inwood beloved by locals. Warm, quiet, and perfect for deep work sessions.",
    tag: "Small Business ⭐",
  },
  {
    id: 2,
    name: "The Bronx Bean",
    neighborhood: "Fordham, Bronx",
    wifi: "Secured (WPA)",
    outlets: "Yes",
    noise: "Medium",
    seats: 18,
    food: "No",
    bathroom: "Yes",
    hours: "8am – 7pm",
    vibe: "A community staple in Fordham. Great espresso and plenty of table space.",
    tag: "Small Business ⭐",
  },
  {
    id: 3,
    name: "Brew & Co",
    neighborhood: "Williamsburg, Brooklyn",
    wifi: "Secured (WPA)",
    outlets: "Limited",
    noise: "Medium",
    seats: 30,
    food: "Yes",
    bathroom: "Yes",
    hours: "7am – 9pm",
    vibe: "A Williamsburg staple with a great playlist and fast wifi.",
    tag: "Scout Verified ✓",
  },
];

export default function Home() {
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [search, setSearch] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    // TODO: wire up to map + Supabase query by zipcode
    alert(`Searching for cafés near: ${search}`);
  };

  return (
    <div className="home">
      <Navbar />

      {/* Search Bar */}
      <div className="search-bar-container">
        <form className="search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Enter a zipcode or neighborhood..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit">Find Cafés ☕</button>
        </form>
      </div>

      {/* Map Placeholder */}
      <div className="map-container">
        <div className="map-placeholder">
          <p>🗺️ Map goes here</p>
          <p className="map-placeholder-sub">
            Map integration will live here.
            <br />
            Click a café below to preview the slide-over panel.
          </p>
          {/* Temporary café pins for testing slide-over */}
          <div className="temp-pins">
            {PLACEHOLDER_CAFES.map((cafe) => (
              <button
                key={cafe.id}
                className="temp-pin"
                onClick={() => setSelectedCafe(cafe)}
              >
                📍 {cafe.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Slide Over Café Profile Panel */}
      {selectedCafe && (
        <>
          <div
            className="slide-over-backdrop"
            onClick={() => setSelectedCafe(null)}
          />
          <div className="slide-over">
            <button
              className="slide-over-close"
              onClick={() => setSelectedCafe(null)}
            >
              ✕
            </button>

            <div className="slide-over-tag">{selectedCafe.tag}</div>
            <h2 className="slide-over-name">{selectedCafe.name}</h2>
            <p className="slide-over-neighborhood">
              📍 {selectedCafe.neighborhood}
            </p>
            <p className="slide-over-vibe">{selectedCafe.vibe}</p>

            <div className="slide-over-amenities">
              <div className="amenity">
                <span className="amenity-label">WiFi</span>
                <span className="amenity-value">{selectedCafe.wifi}</span>
              </div>
              <div className="amenity">
                <span className="amenity-label">Outlets</span>
                <span className="amenity-value">{selectedCafe.outlets}</span>
              </div>
              <div className="amenity">
                <span className="amenity-label">Noise Level</span>
                <span className="amenity-value">{selectedCafe.noise}</span>
              </div>
              <div className="amenity">
                <span className="amenity-label">Seats</span>
                <span className="amenity-value">{selectedCafe.seats}</span>
              </div>
              <div className="amenity">
                <span className="amenity-label">Hot Food</span>
                <span className="amenity-value">{selectedCafe.food}</span>
              </div>
              <div className="amenity">
                <span className="amenity-label">Bathroom</span>
                <span className="amenity-value">{selectedCafe.bathroom}</span>
              </div>
              <div className="amenity">
                <span className="amenity-label">Hours</span>
                <span className="amenity-value">{selectedCafe.hours}</span>
              </div>
            </div>

            <button className="slide-over-save">
              ♡ Save Café
            </button>
          </div>
        </>
      )}
    </div>
  );
}
