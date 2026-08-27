import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Papa from "papaparse";

const API_KEY = import.meta.env.VITE_MAPTILER_API_KEY;

// Initial NYC center & zoom
const INITIAL_CENTER = [-73.97539, 40.7646];
const INITIAL_ZOOM   = 11;

// In-memory cache so markers.csv is fetched and parsed only once per session
let cachedMarkerData = null;

export default function MapComponent({ onMarkerClick, filterQuery, panelOpen, cafes }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]); // [{ marker, data }]
  const [mapLoaded, setMapLoaded] = useState(false);

  // Normalize scout name from different possible CSV column formats
  const extractScoutName = (row) => {
    return (
      row.ScoutName ||
      row.Scout ||
      row["Scout Name"] ||
      row["Scouted By"] ||
      row.ScoutedBy ||
      row["Visited By"] ||
      row.VisitedBy ||
      row.scout_name ||
      row.scout ||
      ""
    );
  };

  // Plot café markers on map
  const plotMarkers = (data) => {
    if (!mapRef.current) return;

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

      const marker = new maplibregl.Marker({ color: "#4e312d" })
        .setLngLat([lon, lat])
        .addTo(mapRef.current);

      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
        `<strong>${row.Name}</strong><br/>${row.Address}`
      );
      marker.setPopup(popup);

      const enriched = {
        ...row,
        ScoutName: scout || row.ScoutName || "",
        _locationCount: locationCount[row.Name?.trim().toLowerCase()] || 1,
      };

      if (onMarkerClick) {
        marker.getElement().addEventListener("click", () => {
          onMarkerClick(enriched);
        });
      }

      markersRef.current.push({ marker, data: enriched });
    });
  };

  // Initialize MapLibre with zero fade delay for fast loading
  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/dataviz-v4/style.json?key=${API_KEY}`,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      fadeDuration: 0, // Instantly displays tiles as they load
      trackResize: true,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");

    mapRef.current.on("load", () => {
      setMapLoaded(true);
    });

    if (!cafes) {
      if (cachedMarkerData) {
        plotMarkers(cachedMarkerData);
      } else {
        fetch("/markers.csv")
          .then((res) => res.text())
          .then((csvText) => {
            const parsed = Papa.parse(csvText, {
              header: true,
              skipEmptyLines: true,
            }).data;
            cachedMarkerData = parsed;
            plotMarkers(parsed);
          })
          .catch((err) => console.error("Error loading markers.csv:", err));
      }
    }

    return () => {
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
      const bounds = new maplibregl.LngLatBounds();
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
    if (!markersRef.current.length || !mapRef.current) return;

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
      const bounds = new maplibregl.LngLatBounds();
      matches.forEach((d) =>
        bounds.extend([parseFloat(d.Longitude), parseFloat(d.Latitude)])
      );
      mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 14, speed: 1.4 });
    }
  }, [filterQuery]);

  // Reset map view back to NYC initial frame
  const resetView = () => {
    if (!mapRef.current) return;

    const coords = markersRef.current
      .map(({ data }) => [parseFloat(data.Longitude), parseFloat(data.Latitude)])
      .filter(([lon, lat]) => !isNaN(lon) && !isNaN(lat));

    if (coords.length === 0) {
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

      {/* Redesigned Reset Button with Espresso Bear */}
      <button
        className="map-reset-btn"
        onClick={resetView}
        title="Reset map view"
        aria-label="Reset map view"
      >
        <img
          src="/espressobear.png"
          alt=""
          aria-hidden="true"
          style={{ width: "20px", height: "20px", objectFit: "contain" }}
        />
        <span className="map-reset-text">Reset</span>
      </button>
    </div>
  );
}