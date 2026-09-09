import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import Papa from "papaparse";

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

const API_KEY = import.meta.env.VITE_MAPTILER_API_KEY;
const INITIAL_CENTER = [-73.97539, 40.7646];
const INITIAL_ZOOM   = 11;

// Prefetch CSV before any component mounts
let cachedMarkerData = null;
let _prefetchPromise = null;
function prefetchMarkers() {
  if (cachedMarkerData || _prefetchPromise) return;
  _prefetchPromise = fetch("/markers.csv")
    .then((res) => res.text())
    .then((csvText) => {
      cachedMarkerData = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;
    })
    .catch(() => {});
}
prefetchMarkers();

export default function MapComponent({ onMarkerClick, filterQuery, panelOpen, cafes }) {
  const mapContainer = useRef(null);
  const mapRef       = useRef(null);
  const mlRef        = useRef(null); // lazy-loaded maplibre-gl module
  const markersRef   = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  const extractScoutName = (row) =>
    row.ScoutName || row.Scout || row["Scout Name"] || row["Scouted By"] ||
    row.ScoutedBy || row["Visited By"] || row.VisitedBy || row.scout_name || row.scout || "";

  const plotMarkers = (data) => {
    const maplibregl = mlRef.current;
    if (!mapRef.current || !maplibregl) return;

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];

    const locationCount = {};
    data.forEach((row) => {
      const key = row.Name?.trim().toLowerCase();
      if (key) locationCount[key] = (locationCount[key] || 0) + 1;
    });

    data.forEach((row) => {
      const lat = parseFloat(row.Latitude);
      const lon = parseFloat(row.Longitude);
      if (isNaN(lat) || isNaN(lon)) return;

      const scout = extractScoutName(row);

      const el = document.createElement("img");
      el.src = "/espressomug-pin.png";
      el.style.width = "70px";
      el.style.height = "70px";
      el.style.objectFit = "contain";
      el.style.cursor = "pointer";

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lon, lat])
        .addTo(mapRef.current);

      const photo = CAFE_PHOTOS[row.Name];
      const popup = new maplibregl.Popup({ offset: 25, maxWidth: "220px" }).setHTML(`
        <div style="font-family:'Inter',sans-serif;border-radius:10px;overflow:hidden;min-width:180px;">
          ${photo
            ? `<img src="${photo}" alt="${row.Name}" style="width:100%;height:120px;object-fit:cover;display:block;border-radius:8px 8px 0 0;" />`
            : `<div style="width:100%;height:120px;background:#1C2E52;border-radius:8px 8px 0 0;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">📷</div>`
          }
          <div style="padding:10px 12px 12px;">
            <strong style="font-size:0.9rem;color:#1C2E52;display:block;margin-bottom:4px;">${row.Name}</strong>
            <span style="font-size:0.75rem;color:#2E5482;">${(row.Address || "").replace(/, United States$/, ", U.S.")}</span>
          </div>
        </div>
      `);

      const enriched = {
        ...row,
        ScoutName: scout || row.ScoutName || "",
        _locationCount: locationCount[row.Name?.trim().toLowerCase()] || 1,
      };

      marker.getElement().addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".maplibregl-popup").forEach((el) => el.remove());
        popup.setLngLat([lon, lat]).addTo(mapRef.current);
        if (onMarkerClick) onMarkerClick(enriched);
      });

      markersRef.current.push({ marker, data: enriched });
    });
  };

  // Initialize map — lazy-load maplibre-gl and defer until container is near viewport
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;

    const initMap = async () => {
      // Dynamically import the heavy MapLibre bundle only when needed
      const maplibregl = (await import("maplibre-gl")).default;
      mlRef.current = maplibregl;

      if (!mapContainer.current || mapRef.current) return;

      mapRef.current = new maplibregl.Map({
        container: mapContainer.current,
        // basic-v2 loads ~60% fewer tile layers than streets-v2
        style: `https://api.maptiler.com/maps/basic-v2/style.json?key=${API_KEY}`,
        center: INITIAL_CENTER,
        zoom: INITIAL_ZOOM,
        fadeDuration: 0,
        trackResize: true,
      });

      mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");

      mapRef.current.on("load", () => {
        setMapLoaded(true);

        if (!cafes) {
          if (cachedMarkerData) {
            plotMarkers(cachedMarkerData);
          } else {
            fetch("/markers.csv")
              .then((res) => res.text())
              .then((csvText) => {
                const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true }).data;
                cachedMarkerData = parsed;
                plotMarkers(parsed);
              })
              .catch((err) => console.error("Error loading markers.csv:", err));
          }
        }
      });
    };

    // Start loading 200px before the map enters the viewport
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        initMap();
      },
      { rootMargin: "200px", threshold: 0 }
    );

    observer.observe(mapContainer.current);

    return () => {
      observer.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-plot when saved cafés change (Dashboard mode)
  useEffect(() => {
    if (!cafes || !mapRef.current) return;

    plotMarkers(cafes);

    const coords = cafes
      .map((d) => [parseFloat(d.Longitude), parseFloat(d.Latitude)])
      .filter(([lon, lat]) => !isNaN(lon) && !isNaN(lat));

    if (coords.length === 1) {
      mapRef.current.flyTo({ center: coords[0], zoom: 14, speed: 1.4 });
    } else if (coords.length > 1) {
      const bounds = new mlRef.current.LngLatBounds();
      coords.forEach((c) => bounds.extend(c));
      mapRef.current.fitBounds(bounds, { padding: 70, maxZoom: 13 });
    }
  }, [cafes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resize map when panel opens/closes
  useEffect(() => {
    if (!mapRef.current) return;
    const timer = setTimeout(() => mapRef.current?.resize(), 300);
    return () => clearTimeout(timer);
  }, [panelOpen]);

  // Filter markers on search query change
  useEffect(() => {
    if (!markersRef.current.length || !mapRef.current || !mlRef.current) return;

    const q = (filterQuery || "").trim().toLowerCase();

    if (!q) {
      markersRef.current.forEach(({ marker }) => {
        if (!marker._map) marker.addTo(mapRef.current);
      });
      return;
    }

    const matches = [];

    markersRef.current.forEach(({ marker, data }) => {
      const haystack = [data.Name, data.Address, data.County, data.Zipcode]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (haystack.includes(q)) {
        if (!marker._map) marker.addTo(mapRef.current);
        matches.push(data);
      } else {
        marker.remove();
      }
    });

    if (matches.length === 1) {
      mapRef.current.flyTo({
        center: [parseFloat(matches[0].Longitude), parseFloat(matches[0].Latitude)],
        zoom: 15,
        speed: 1.4,
      });
    } else if (matches.length > 1) {
      const bounds = new mlRef.current.LngLatBounds();
      matches.forEach((d) =>
        bounds.extend([parseFloat(d.Longitude), parseFloat(d.Latitude)])
      );
      mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 14, speed: 1.4 });
    }
  }, [filterQuery]);

  const resetView = () => {
    if (!mapRef.current || !mlRef.current) return;

    const coords = markersRef.current
      .map(({ data }) => [parseFloat(data.Longitude), parseFloat(data.Latitude)])
      .filter(([lon, lat]) => !isNaN(lon) && !isNaN(lat));

    if (coords.length === 0) {
      mapRef.current.flyTo({ center: INITIAL_CENTER, zoom: INITIAL_ZOOM, speed: 1.2 });
      return;
    }

    const bounds = new mlRef.current.LngLatBounds();
    coords.forEach((c) => bounds.extend(c));
    mapRef.current.fitBounds(bounds, { padding: 70, maxZoom: 13, speed: 1.2 });
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "500px" }}>
      {!mapLoaded && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 2,
          background: "linear-gradient(120deg, #1C2E52 0%, #0F1A2E 50%, #1C2E52 100%)",
          backgroundSize: "200% 100%",
          animation: "mapShimmer 1.4s ease-in-out infinite",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "rgba(224,217,207,0.4)", fontFamily: "'Imbue', serif", fontSize: "0.9rem",
          letterSpacing: "0.08em",
        }}>
          Loading map…
          <style>{`@keyframes mapShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
        </div>
      )}
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

      <button
        className="map-reset-btn"
        onClick={resetView}
        title="Reset map view"
        aria-label="Reset map view"
      >
        <img
          src="/wb-logo-light.png"
          alt=""
          aria-hidden="true"
          style={{ width: "20px", height: "20px", objectFit: "contain", filter: "brightness(0) saturate(1) invert(88%) sepia(8%) saturate(400%) hue-rotate(350deg) brightness(1.0)" }}
        />
        <span className="map-reset-text">Reset</span>
      </button>
    </div>
  );
}
