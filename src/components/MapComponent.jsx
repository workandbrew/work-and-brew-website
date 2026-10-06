import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { createClient } from "@supabase/supabase-js";

// ── Supabase (read-only public client) ────────────────────────────────────────
const SUPABASE_URL      = "https://occdbhckswnhzkubfyge.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jY2RiaGNrc3duaHprdWJmeWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNTIyMTMsImV4cCI6MjA5OTkyODIxM30.t8jbngCkE-UHrKpqoTUa82vnp8orbB5qCYnZ_nOIx6w";
const supabase          = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Borough palette (matches scout-map.html) ──────────────────────────────────
const BORO_COLORS = {
  Bronx:     "#E53935",
  Manhattan: "#1E88E5",
  Brooklyn:  "#43A047",
  Queens:    "#FB8C00",
};
const BOROUGHS = ["All", "Bronx", "Manhattan", "Brooklyn", "Queens"];

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

// Prefetch from Supabase before any component mounts
let cachedMarkerData = null;
let _prefetchPromise = null;
function prefetchMarkers() {
  if (cachedMarkerData || _prefetchPromise) return;
  _prefetchPromise = supabase
    .from("map_cafes")
    .select("*")
    .order("borough", { ascending: true })
    .order("name",    { ascending: true })
    .then(({ data, error }) => {
      if (error) { console.error("Supabase map_cafes error:", error.message); return; }
      // Normalise to match the shape the rest of the component expects
      cachedMarkerData = (data || []).map((r) => ({
        Name:              r.name,
        Address:           r.address,
        Zipcode:           r.zipcode,
        County:            r.borough,
        Latitude:          String(r.latitude),
        Longitude:         String(r.longitude),
        Description:       r.description || "",
        Highlight:         r.highlight ? "TRUE" : "FALSE",
        WiFi:              r.wifi    ? "YES" : "NO",
        Secured:           r.secured ? "YES" : "NO",
        Outlets:           r.outlets ? "YES" : "NO",
        HotFood:           r.hot_food ? "YES" : "NO",
        Restroom:          r.restroom ? "YES" : "NO",
        Seats:             r.seats || "",
        TimeRestriction:   r.time_restriction ? "TRUE" : "FALSE",
        RestrictionAmount: r.restriction_amount || "",
        ScoutName:         r.scout_name || "",
        _id:               r.id,
      }));
    })
    .catch(() => {});
}
prefetchMarkers();

// ── Borough-colored circle marker element ─────────────────────────────────────
function createBoroMarkerEl(borough) {
  const color = BORO_COLORS[borough] || "#9E9E9E";
  const el = document.createElement("div");
  el.style.cssText = `
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${color};
    border: 2.5px solid rgba(255,255,255,0.9);
    box-shadow: 0 2px 8px rgba(0,0,0,0.45);
    cursor: pointer;
    transition: transform 0.15s, box-shadow 0.15s;
    flex-shrink: 0;
  `;
  el.addEventListener("mouseenter", () => {
    el.style.transform = "scale(1.55)";
    el.style.boxShadow = `0 4px 14px ${color}88`;
    el.style.zIndex = "10";
  });
  el.addEventListener("mouseleave", () => {
    el.style.transform = "scale(1)";
    el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.45)";
    el.style.zIndex = "";
  });
  return el;
}

export default function MapComponent({ onMarkerClick, filterQuery, panelOpen, cafes }) {
  const mapContainer = useRef(null);
  const mapRef       = useRef(null);
  const mlRef        = useRef(null);
  const markersRef   = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [activeBoro, setActiveBoro] = useState("All");
  const [stats, setStats] = useState({});

  const extractScoutName = (row) =>
    row.ScoutName || row.Scout || row["Scout Name"] || row["Scouted By"] ||
    row.ScoutedBy || row["Visited By"] || row.VisitedBy || row.scout_name || row.scout || "";

  const plotMarkers = (data) => {
    const maplibregl = mlRef.current;
    if (!mapRef.current || !maplibregl) return;

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];

    // Compute stats
    const counts = {};
    data.forEach((row) => {
      const b = row.County?.trim() || "Other";
      counts[b] = (counts[b] || 0) + 1;
    });
    setStats(counts);

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
      const borough = row.County?.trim() || "";
      const el = createBoroMarkerEl(borough);

      const marker = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([lon, lat])
        .addTo(mapRef.current);

      const photo = CAFE_PHOTOS[row.Name];
      const boroColor = BORO_COLORS[borough] || "#9E9E9E";
      const popup = new maplibregl.Popup({ offset: 16, maxWidth: "240px" }).setHTML(`
        <div style="font-family:'Inter',sans-serif;border-radius:12px;overflow:hidden;min-width:200px;">
          ${photo
            ? `<img src="${photo}" alt="${row.Name}" style="width:100%;height:130px;object-fit:cover;display:block;" />`
            : `<div style="width:100%;height:130px;background:#2C1A0E;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">☕</div>`
          }
          <div style="padding:10px 14px 13px;">
            <div style="display:flex;align-items:center;gap:7px;margin-bottom:5px;">
              <span style="width:9px;height:9px;border-radius:50%;background:${boroColor};flex-shrink:0;display:inline-block;"></span>
              <span style="font-size:0.68rem;font-weight:700;color:${boroColor};text-transform:uppercase;letter-spacing:0.06em;">${borough}</span>
            </div>
            <strong style="font-size:0.9rem;color:#2C1A0E;display:block;margin-bottom:3px;line-height:1.3;">${row.Name}</strong>
            <span style="font-size:0.72rem;color:#6E4F3A;line-height:1.4;">${(row.Address || "").replace(/, United States$/, "")}</span>
          </div>
        </div>
      `);

      const enriched = {
        ...row,
        ScoutName: scout || row.ScoutName || "",
        _locationCount: locationCount[row.Name?.trim().toLowerCase()] || 1,
      };

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".maplibregl-popup").forEach((p) => p.remove());
        popup.setLngLat([lon, lat]).addTo(mapRef.current);
        if (onMarkerClick) onMarkerClick(enriched);
      });

      markersRef.current.push({ marker, data: enriched });
    });
  };

  // Initialize map
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;

    const initMap = async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      mlRef.current = maplibregl;

      if (!mapContainer.current || mapRef.current) return;

      mapRef.current = new maplibregl.Map({
        container: mapContainer.current,
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
            // Supabase fetch still in-flight — wait for it then plot
            (_prefetchPromise || Promise.resolve()).then(() => {
              if (cachedMarkerData) plotMarkers(cachedMarkerData);
            });
          }
        }
      });
    };

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

  // Apply text search + borough filter
  useEffect(() => {
    if (!markersRef.current.length || !mapRef.current || !mlRef.current) return;

    const q = (filterQuery || "").trim().toLowerCase();
    const boro = activeBoro === "All" ? "" : activeBoro;

    const matches = [];

    markersRef.current.forEach(({ marker, data }) => {
      const boroMatch = !boro || data.County?.trim() === boro;
      const textMatch = !q || [data.Name, data.Address, data.County, data.Zipcode]
        .filter(Boolean).join(" ").toLowerCase().includes(q);

      if (boroMatch && textMatch) {
        if (!marker._map) marker.addTo(mapRef.current);
        matches.push(data);
      } else {
        marker.remove();
      }
    });

    if (matches.length === 1) {
      mapRef.current.flyTo({
        center: [parseFloat(matches[0].Longitude), parseFloat(matches[0].Latitude)],
        zoom: 15, speed: 1.4,
      });
    } else if (matches.length > 1 && (q || boro)) {
      const bounds = new mlRef.current.LngLatBounds();
      matches.forEach((d) => bounds.extend([parseFloat(d.Longitude), parseFloat(d.Latitude)]));
      mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 14, speed: 1.4 });
    }
  }, [filterQuery, activeBoro]);

  const resetView = () => {
    if (!mapRef.current || !mlRef.current) return;
    setActiveBoro("All");
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

  const totalVisible = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "500px" }}>

      {/* ── Loading shimmer ── */}
      {!mapLoaded && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 2,
          background: "linear-gradient(120deg, #2C1A0E 0%, #180A02 50%, #2C1A0E 100%)",
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

      {/* ── Stats bar — top left ── */}
      {mapLoaded && totalVisible > 0 && (
        <div style={{
          position: "absolute", top: 14, left: 14, zIndex: 10,
          display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
        }}>
          <div style={{
            background: "rgba(26,12,4,0.88)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(224,217,207,0.15)", borderRadius: 8,
            padding: "5px 12px", display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(224,217,207,0.55)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Cafes
            </span>
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "#D4BFA0" }}>
              {totalVisible}
            </span>
          </div>
          {["Bronx","Manhattan","Brooklyn","Queens"].map((b) => stats[b] ? (
            <div key={b} style={{
              background: "rgba(26,12,4,0.88)", backdropFilter: "blur(8px)",
              border: `1px solid ${BORO_COLORS[b]}44`,
              borderRadius: 8, padding: "5px 10px",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: BORO_COLORS[b], display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#D4BFA0", whiteSpace: "nowrap" }}>
                {b} <span style={{ color: "#E0D9CF", fontWeight: 800 }}>{stats[b]}</span>
              </span>
            </div>
          ) : null)}
        </div>
      )}

      {/* ── Borough pill filter — top right ── */}
      {mapLoaded && (
        <div style={{
          position: "absolute", top: 14, right: 14, zIndex: 10,
          display: "flex", gap: 5,
        }}>
          {BOROUGHS.map((b) => {
            const isActive = activeBoro === b;
            const color = b === "All" ? null : BORO_COLORS[b];
            return (
              <button
                key={b}
                onClick={() => setActiveBoro(b)}
                style={{
                  background: isActive
                    ? (color || "rgba(224,217,207,0.22)")
                    : "rgba(26,12,4,0.88)",
                  backdropFilter: "blur(8px)",
                  border: isActive
                    ? `1.5px solid ${color || "rgba(224,217,207,0.4)"}`
                    : "1.5px solid rgba(224,217,207,0.18)",
                  borderRadius: 7,
                  color: isActive ? "#fff" : "rgba(224,217,207,0.7)",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  padding: "5px 11px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                }}
              >
                {b}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Reset view button — bottom left ── */}
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
