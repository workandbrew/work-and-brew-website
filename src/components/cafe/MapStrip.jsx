import { useEffect, useState } from "react";
import { BORO_COLORS } from "../../lib/cafes";

// A wide preview of the café map on real MapTiler tiles (same basic-v2 style as the full map),
// with every café as a borough-coloured dot. Tapping it opens the Map view.
// The tiles come from MapTiler's static-maps API; without a key it falls back to a plain grid.

const KEY = import.meta.env.VITE_MAPTILER_API_KEY;

// One framing per layout. Width × height are the image's logical pixels (served @2x);
// the strip keeps the same aspect ratio so the projected dots stay put.
const FRAMES = {
  desktop: { w: 1024, h: 150, lng: -73.905, lat: 40.745, zoom: 9.5 },
  mobile:  { w: 600,  h: 220, lng: -73.905, lat: 40.745, zoom: 9.4 },
};

// Web Mercator projection → percentage position inside the static image.
function project(frame, lng, lat) {
  const scale = (256 * 2 ** frame.zoom) / (2 * Math.PI);
  const merc = (la) => Math.log(Math.tan(Math.PI / 4 + (la * Math.PI) / 360));
  const x = ((lng - frame.lng) * Math.PI) / 180 * scale;
  const y = (merc(frame.lat) - merc(lat)) * scale;
  return { left: 50 + (x / frame.w) * 100, top: 50 + (y / frame.h) * 100 };
}

export default function MapStrip({ cafes, onOpen }) {
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 640px)").matches);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = (e) => setMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const frame = mobile ? FRAMES.mobile : FRAMES.desktop;
  const src = KEY && !failed
    ? `https://api.maptiler.com/maps/basic-v2/static/${frame.lng},${frame.lat},${frame.zoom}/${frame.w}x${frame.h}@2x.png?key=${KEY}&attribution=false`
    : null;

  return (
    <button type="button" className={`map-strip ${src ? "" : "map-strip--plain"}`} style={{ aspectRatio: `${frame.w} / ${frame.h}` }} onClick={onOpen} aria-label="Open the map view">
      {src ? <img className="map-strip__tiles" src={src} alt="" onError={() => setFailed(true)} /> : <span className="map-strip__grid" />}
      {cafes.map((c) => {
        if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return null;
        const p = project(frame, c.lng, c.lat);
        if (p.left < 0 || p.left > 100 || p.top < 0 || p.top > 100) return null;
        return <i key={c.id} className="map-strip__dot" style={{ left: `${p.left}%`, top: `${p.top}%`, background: BORO_COLORS[c.borough] || "#999" }} />;
      })}
      <span className="map-strip__label">Map · tap to expand</span>
      <span className="map-strip__go" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </span>
      {src && <span className="map-strip__credit">© MapTiler © OpenStreetMap contributors</span>}
    </button>
  );
}
