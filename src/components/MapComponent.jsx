import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Papa from "papaparse";

const API_KEY = import.meta.env.VITE_MAPTILER_API_KEY;

// Initial NYC view used as the fallback when there are no markers
const INITIAL_CENTER = [-73.97539, 40.7646];
const INITIAL_ZOOM   = 11;

export default function MapComponent({ onMarkerClick, filterQuery, panelOpen, cafes }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]); // [{ marker, data }]

// Map cafe names to their preview photos (matches Home.jsx)
const CAFE_IMAGES = {
  "Mottley Kitchen": "/cafe-images/mottley-kitchen.avif",
  // Add more as scouted: "Cafe Name": "/cafe-images/filename.jpg"
};

const plotMarkers = (data) => {
  const locationCount = {};
  data.forEach((row) => {
    const key = row.Name?.trim().toLowerCase();
    if (key) locationCount[key] = (locationCount[key] || 0) + 1;
  });

  data.forEach((row) => {
    const lat = parseFloat(row.Latitude);
    const lon = parseFloat(row.Longitude);
    if (isNaN(lat) || isNaN(lon)) return;

    // ── 1. Bigger, bolder pin marker ──
    const el = document.createElement("div");
    el.className = "custom-cafe-marker";
    el.style.width = "70px";          // Increased size for visibility
    el.style.height = "70px";
    el.style.backgroundImage = 'url("/espressomug-pin.png")';
    el.style.backgroundSize = "contain";
    el.style.backgroundRepeat = "no-repeat";
    el.style.backgroundPosition = "center bottom";
    el.style.cursor = "pointer";

    const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
      .setLngLat([lon, lat])
      .addTo(mapRef.current);

    // ── 2. Photo preview + dark brown text popup ──
    const photoUrl = row.Photo || CAFE_IMAGES[row.Name] || null;
    const photoHtml = photoUrl
      ? `<div class="popup-photo-wrap"><img src="${photoUrl}" alt="${row.Name}" class="popup-photo" /></div>`
      : `<div class="popup-photo-wrap popup-photo-placeholder">☕ <span>Work & Brew</span></div>`;

    const popup = new maplibregl.Popup({ offset: 30, closeButton: true }).setHTML(`
      <div class="custom-map-popup">
        ${photoHtml}
        <div class="popup-content-body">
          <h4 class="popup-title">${row.Name}</h4>
          <p class="popup-address">${row.Address}</p>
          <span class="popup-tap-hint">Tap to view details →</span>
        </div>
      </div>
    `);
    marker.setPopup(popup);

    const enriched = {
      ...row,
      _locationCount: locationCount[row.Name?.trim().toLowerCase()] || 1,
    };

    if (onMarkerClick) {
      el.addEventListener("click", () => {
        onMarkerClick(enriched);
      });
    }

    markersRef.current.push({ marker, data: enriched });
  });
};

  // Initialize map once
  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/dataviz-v4/style.json?key=${API_KEY}`,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl());

    // If a page hands us its own cafés (like the dashboard's saved ones)
    // we skip the csv — the effect below handles plotting those
    if (!cafes) {
      fetch("/markers.csv")
        .then((res) => res.text())
        .then((csvText) => {
          const data = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
          }).data;
          plotMarkers(data);
        })
        .catch((err) => console.error("Error loading markers.csv:", err));
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-plot whenever the saved cafés change (dashboard mode only)
  useEffect(() => {
    if (!cafes || !mapRef.current) return;

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];
    plotMarkers(cafes);

    // frame all the saved spots
    const coords = cafes
      .map((d) => [parseFloat(d.Longitude), parseFloat(d.Latitude)])
      .filter(([lon, lat]) => !isNaN(lon) && !isNaN(lat));

    if (coords.length === 1) {
      mapRef.current.flyTo({ center: coords[0], zoom: 14, speed: 1.4 });
    } else if (coords.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      coords.forEach((c) => bounds.extend(c));
      mapRef.current.fitBounds(bounds, { padding: 70, maxZoom: 13 });
    }
  }, [cafes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resize map when panel opens/closes
  useEffect(() => {
    if (!mapRef.current) return;
    const timer = setTimeout(() => mapRef.current?.resize(), 500);
    return () => clearTimeout(timer);
  }, [panelOpen]);

  // Filter markers when search query changes
  useEffect(() => {
    if (!markersRef.current.length) return;

    const q = (filterQuery || "").trim().toLowerCase();

    if (!q) {
      // Show all markers
      markersRef.current.forEach(({ marker }) => {
        if (!marker._map) marker.addTo(mapRef.current);
      });
      return;
    }

    const matches = [];

    markersRef.current.forEach(({ marker, data }) => {
      const haystack = [data.Name, data.Address, data.County, data.Zipcode]
        .join(" ")
        .toLowerCase();

      if (haystack.includes(q)) {
        if (!marker._map) marker.addTo(mapRef.current);
        matches.push(data);
      } else {
        marker.remove();
      }
    });

    // Fly to results
    if (matches.length === 1) {
      mapRef.current.flyTo({
        center: [parseFloat(matches[0].Longitude), parseFloat(matches[0].Latitude)],
        zoom: 15,
        speed: 1.4,
      });
    } else if (matches.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      matches.forEach((d) =>
        bounds.extend([parseFloat(d.Longitude), parseFloat(d.Latitude)])
      );
      mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 14, speed: 1.4 });
    }
  }, [filterQuery]);

  // Fits the map to every marker (visible + hidden) so the user sees
  // the whole café map again no matter how far they've zoomed in.
  const resetView = () => {
    if (!mapRef.current) return;

    const coords = markersRef.current
      .map(({ data }) => [parseFloat(data.Longitude), parseFloat(data.Latitude)])
      .filter(([lon, lat]) => !isNaN(lon) && !isNaN(lat));

    if (coords.length === 0) {
      // No markers yet — fly back to the initial NYC view
      mapRef.current.flyTo({ center: INITIAL_CENTER, zoom: INITIAL_ZOOM, speed: 1.2 });
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    coords.forEach((c) => bounds.extend(c));
    mapRef.current.fitBounds(bounds, { padding: 70, maxZoom: 13, speed: 1.2 });
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "500px" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

      {/* Reset view button — overlaid in the bottom-left of the map */}
      <button className="map-reset-btn" onClick={resetView} title="Reset map view">
        {/* Crosshair / target icon */}
        <svg
          width="14" height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2"  x2="12" y2="7"  />
          <line x1="12" y1="17" x2="12" y2="22" />
          <line x1="2"  y1="12" x2="7"  y2="12" />
          <line x1="17" y1="12" x2="22" y2="12" />
        </svg>
        Reset View
      </button>
    </div>
  );
}
