// Shared café data for the public site.
//
// Loads the scouted-café list (same feed MapComponent uses) and normalises each row
// into the shape the home page and the team postcards render. The amenity values, time-limit
// buckets and filters here are the ones settled in the Oct 2026 wireframes.

import { useEffect, useState } from "react";
import Papa from "papaparse";

const MARKERS_FEED_URL = import.meta.env.VITE_MARKERS_FEED_URL || "";

// Scouts shown on the site. Anyone not listed is credited to the team as a whole.
export const SCOUT_THUMBS = {
  Denisse: "/Team-photos/thumbs/Denisse.jpg",
  Sayraliz: "/Team-photos/thumbs/Sayraliz.jpg",
  Orlando: "/Team-photos/thumbs/Orlando.jpg",
  Mellanie: "/Team-photos/thumbs/Mellanie.jpg",
  Christopher: "/Team-photos/thumbs/Christopher.jpg",
  Armando: "/Team-photos/thumbs/Armando.jpg",
  Iris: "/Team-photos/thumbs/Iris.jpg",
  Jadyn: "/Team-photos/thumbs/Jadyn.jpg",
  David: "/Team-photos/thumbs/David.jpg",
};
export const TEAM_SCOUT = "Work & Brew Scout";

// Borough colours: light fills for dots / tabs, dark fills for pills on cream.
export const BORO_COLORS = { Manhattan: "#C8A77A", Brooklyn: "#6FA3D8", Bronx: "#E0A070", Queens: "#9BC58F" };
export const BORO_DARK = { Manhattan: "#8A6A3E", Brooklyn: "#2E5482", Bronx: "#A65F2F", Queens: "#4F7A45" };
export const BOROUGHS = ["All", "Manhattan", "Brooklyn", "Bronx", "Queens"];

// Cafés with their own photo on the site (key = `${Name}|${County}` from the sheet).
const REAL_PHOTOS = {
  "Artizen Cafe|Bronx": "/cafes/web/artizen-cafe-bronx.jpg",
  "Savor Coffee and More|Bronx": "/cafes/web/savor-coffee-and-more-bronx.jpg",
  "The Boogie Down Grind|Bronx": "/cafes/web/the-boogie-down-grind-bronx.jpg",
  "Kofee|Brooklyn": "/cafes/web/kofee-brooklyn.jpg",
  "Burly Coffee|Brooklyn": "/cafes/web/burly-coffee-brooklyn.jpg",
  "Lakou Cafe|Brooklyn": "/cafes/web/lakou-cafe-brooklyn.jpg",
  "Postmark Cafe|Brooklyn": "/cafes/web/postmark-cafe-brooklyn.jpg",
  "Culture Espresso|Manhattan": "/cafes/web/culture-espresso-manhattan.jpg",
  "Gold Coffee|Manhattan": "/cafes/web/gold-coffee-manhattan.jpg",
  "Ginjan Cafe|Manhattan": "/cafes/web/ginjan-cafe-manhattan.jpg",
  "Spitfire Cheese & Sundry|Manhattan": "/cafes/web/spitfire-cheese-and-sundry-manhattan.jpg",
  "The Monkey Cup|Manhattan": "/cafes/web/the-monkey-cup-manhattan.jpg",
  "Stepping Stone Cafe|Queens": "/cafes/web/stepping-stone-cafe-queens.jpg",
  "Full Moon Cafe|Queens": "/cafes/web/full-moon-cafe-queens.jpg",
};
// Real interiors from other scouted cafés, used (and labelled) until every café has its own.
const SAMPLE_POOL = Array.from({ length: 20 }, (_, i) => `/cafes/web/sample-${String(i + 1).padStart(2, "0")}.jpg`);

const PLACEHOLDER_DESC = /^TBD/i;

export const yes = (v) => String(v || "").trim().toUpperCase() === "YES";

// Time-limit buckets used by the cards, the directory and the map filters.
export function timeLimit(row) {
  const flag = String(row.TimeRestriction || "").trim().toUpperCase();
  if (flag !== "TRUE" && flag !== "YES") return "No limit";
  const a = String(row.RestrictionAmount || "").toLowerCase();
  if (/90/.test(a)) return "90 min";
  if (/laptop.*week|weekend/.test(a)) return "No laptops wknd";
  if (/7\s*pm|early close|before evening|evening|daytime/.test(a)) return "Daytime only";
  return "Purchase limit";
}

// ---- opening hours ---------------------------------------------------------
// The sheet feed carries HoursByDay (JSON from the scout form: {every:[open,close], ex:[{day,o,c}]},
// times as "HH:MM" 24h) and, for older rows, HoursWeekday / HoursWeekend as "7:00 AM to 6:00 PM".
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toMinutes(t) {
  const s = String(t || "").trim();
  let m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m) { let h = +m[1] % 12; if (/pm/i.test(m[3])) h += 12; return h * 60 + +m[2]; }
  m = s.match(/^(\d{1,2})\s*(AM|PM)$/i);
  if (m) { let h = +m[1] % 12; if (/pm/i.test(m[2])) h += 12; return h * 60; }
  m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) return +m[1] * 60 + +m[2];
  return null;
}
function splitRange(str) {
  const parts = String(str || "").split(/\s+to\s+|\s*[-–]\s*/);
  const o = toMinutes(parts[0]), c = toMinutes(parts[1]);
  return o != null && c != null ? [o, c] : null;
}

// → { Sun: [open, close] | null, … } or null when the café has no hours on file
export function parseHours(row) {
  const byDay = {};
  let any = false;
  try {
    const hb = JSON.parse(row.HoursByDay || "");
    const every = hb.every && toMinutes(hb.every[0]) != null ? [toMinutes(hb.every[0]), toMinutes(hb.every[1])] : null;
    DAYS.forEach((d) => { byDay[d] = every; });
    (hb.ex || []).forEach((e) => { const o = toMinutes(e.o), c = toMinutes(e.c); if (e.day) byDay[e.day.slice(0, 3)] = o != null && c != null ? [o, c] : null; });
    any = !!every || (hb.ex || []).length > 0;
  } catch {
    const wd = splitRange(row.HoursWeekday);
    const we = splitRange(row.HoursWeekend) || wd;
    if (wd) { DAYS.forEach((d, i) => { byDay[d] = i === 0 || i === 6 ? we : wd; }); any = true; }
  }
  return any ? byDay : null;
}

// Open at `now`? null when hours are unknown. Handles closing after midnight.
export function isOpenAt(c, now = new Date()) {
  if (!c.hours) return null;
  const day = DAYS[now.getDay()], prev = DAYS[(now.getDay() + 6) % 7];
  const mins = now.getHours() * 60 + now.getMinutes();
  const today = c.hours[day], yesterday = c.hours[prev];
  if (today) {
    const [o, cl] = today;
    if (cl > o ? mins >= o && mins < cl : mins >= o) return true;
  }
  if (yesterday) { const [o, cl] = yesterday; if (cl <= o && mins < cl) return true; }
  return false;
}
const fmt = (m) => { const h = Math.floor(m / 60) % 24, mm = m % 60; const ap = h >= 12 ? "PM" : "AM"; return `${h % 12 || 12}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${ap}`; };
export function hoursToday(c, now = new Date()) {
  const h = c.hours && c.hours[DAYS[now.getDay()]];
  return h ? `${fmt(h[0])} – ${fmt(h[1])}` : null;
}

function neighborhood(address, borough) {
  // "2430 Third Ave, Bronx, NY 10451[, United States]" → the segment before the "NY 10451" one
  const parts = String(address || "").split(",").map((p) => p.trim());
  const stateIdx = parts.findIndex((p) => /^(NY|New York)\b/i.test(p) && /\d{5}/.test(p));
  const city = stateIdx > 0 ? parts[stateIdx - 1] : "";
  if (!city || /^new york$/i.test(city) || city === borough) return borough;
  return city;
}

function scoutName(row) {
  const raw = (row.ScoutName || row.Scout || row["Scout Name"] || row["Scouted By"] || "").trim();
  const first = raw.split(/[\s(]/)[0];
  return SCOUT_THUMBS[first] ? first : TEAM_SCOUT;
}

export function normalizeCafes(rows) {
  const counts = {};
  rows.forEach((r) => { const k = (r.Name || "").trim().toLowerCase(); if (k) counts[k] = (counts[k] || 0) + 1; });

  return rows
    .filter((r) => r.Name && r.Name.trim())
    .map((row, i) => {
      const name = row.Name.trim();
      const borough = (row.County || "").trim();
      const key = `${name}|${borough}`;
      const real = REAL_PHOTOS[key];
      const c = {
        id: `${name}|${(row.Address || "").trim()}`,
        index: i,
        name,
        borough,
        hood: neighborhood(row.Address, borough),
        address: (row.Address || "").replace(/, United States$/, "").trim(),
        zip: (row.Zipcode || "").trim(),
        lat: parseFloat(row.Latitude),
        lng: parseFloat(row.Longitude),
        wifi: yes(row.WiFi),
        secured: yes(row.Secured),
        outlets: yes(row.Outlets),
        hotFood: yes(row.HotFood),
        restroom: yes(row.Restroom),
        seats: (row.Seats || "").trim() || "Some",
        limit: timeLimit(row),
        scout: scoutName(row),
        desc: PLACEHOLDER_DESC.test(row.Description || "") ? "" : (row.Description || "").replace(/\\(["'])/g, "$1").trim(),
        photo: real || SAMPLE_POOL[i % SAMPLE_POOL.length],
        realPhoto: !!real,
        locations: counts[name.toLowerCase()] || 1,
        hours: parseHours(row),
        raw: row,
      };
      return c;
    });
}

export const locationLabel = (c) => (c.hood === c.borough ? c.borough : `${c.hood}, ${c.borough}`);
export const wifiLabel = (c) => (c.wifi ? (c.secured ? "Secured Wi‑Fi" : "Open Wi‑Fi") : "No Wi‑Fi");
export const statLine = (c) => `${wifiLabel(c)} · ${c.outlets ? "Outlets" : "No outlets"} · ${c.seats} seats · ${c.limit}`;
export const shortDesc = (c, n = 110) => (c.desc.length > n ? c.desc.slice(0, n).trimEnd() + "…" : c.desc);

// Needs tiles on the map view (default-on: outlets, no time limit).
export const NEEDS = [
  { key: "outlets", label: "Outlets", test: (c) => c.outlets, on: true },
  { key: "secured", label: "Secured Wi‑Fi", test: (c) => c.wifi && c.secured },
  { key: "nolimit", label: "No time limit", test: (c) => c.limit === "No limit", on: true },
  { key: "food", label: "Hot food", test: (c) => c.hotFood },
  { key: "restroom", label: "Restroom", test: (c) => c.restroom },
  { key: "seats", label: "Ample seating", test: (c) => /Ample|Many/i.test(c.seats) },
];

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---- loading ---------------------------------------------------------------

function fetchCsv() {
  const local = () => fetch("/markers.csv").then((r) => r.text());
  if (!MARKERS_FEED_URL) return local();
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 8000);
  return fetch(MARKERS_FEED_URL, { signal: ctrl.signal })
    .then((r) => (r.ok ? r.text() : Promise.reject(new Error("feed " + r.status))))
    .then((t) => (t && t.indexOf("Name,") === 0 ? t : Promise.reject(new Error("bad feed"))))
    .catch(() => local());
}

let cache = null;
let pending = null;
export function loadCafes() {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetchCsv()
      .then((text) => {
        const rows = Papa.parse(text, { header: true, skipEmptyLines: true }).data;
        cache = normalizeCafes(rows);
        return cache;
      })
      .catch(() => { pending = null; return []; });
  }
  return pending;
}

export function useCafes() {
  const [cafes, setCafes] = useState(cache || []);
  const [loading, setLoading] = useState(!cache);
  useEffect(() => {
    let alive = true;
    loadCafes().then((list) => { if (alive) { setCafes(list); setLoading(false); } });
    return () => { alive = false; };
  }, []);
  return { cafes, loading };
}
