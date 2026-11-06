import { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import MapComponent from "../components/MapComponent";
import SiteFooter from "../components/SiteFooter";
import CafeCard from "../components/cafe/CafeCard";
import CafePanel from "../components/cafe/CafePanel";
import ScoutAvatar from "../components/cafe/ScoutAvatar";
import MapStrip from "../components/cafe/MapStrip";
import ScoutPostcards from "../components/cafe/ScoutPostcards";
import { useAuth } from "../context/AuthContext";
import {
  BOROUGHS, BORO_COLORS, NEEDS, TEAM_SCOUT,
  haversineKm, isOpenAt, locationLabel, shortDesc, useCafes, wifiLabel,
} from "../lib/cafes";
import "../components/cafe/Cafe.css";
import "./Home.css";

const VIEWS = [["grid", "Grid"], ["dir", "Directory"], ["map", "Map"]];
const SORTS = { name: "A–Z", near: "Nearest" };

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

export default function Home() {
  const { user } = useAuth();
  const { cafes, loading } = useCafes();

  const [view, setView] = useState(() => (["grid", "dir", "map"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "grid"));
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [openOnly, setOpenOnly] = useState(false);
  const [boro, setBoro] = useState("All");
  const [needs, setNeeds] = useState(() => new Set(NEEDS.filter((n) => n.on).map((n) => n.key)));
  const [dirSort, setDirSort] = useState("name");
  const [hover, setHover] = useState(null);
  const [open, setOpen] = useState(null);
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);

  useEffect(() => { history.replaceState(null, "", location.pathname + location.search + (view === "grid" ? "" : `#${view}`)); }, [view]);
  useEffect(() => {
    if (!sortOpen) return;
    const close = (e) => { if (!sortRef.current?.contains(e.target)) setSortOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [sortOpen]);

  const chooseSort = (key) => {
    setSortOpen(false);
    if (key !== "near") { setSort(key); return; }
    if (coords) { setSort("near"); return; }
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setSort("near"); setLocating(false); },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  const name = user ? (user.preferredName || user.username || "").replace(/^./, (ch) => ch.toUpperCase()) : "";
  const q = query.trim().toLowerCase();

  // Search applies everywhere; borough tabs only to the grid; needs only to the map.
  // (70-odd cafés: plain filters are cheap, so nothing here is memoised.)
  const now = new Date();
  const withHours = cafes.filter((c) => c.hours).length;
  const searched = cafes.filter((c) =>
    (!q || [c.name, c.hood, c.borough, c.zip, c.address].join(" ").toLowerCase().includes(q)) &&
    (!openOnly || isOpenAt(c, now) === true)
  );
  const sorter =
    sort === "near" && coords ? (a, b) => haversineKm(coords.lat, coords.lng, a.lat, a.lng) - haversineKm(coords.lat, coords.lng, b.lat, b.lng)
    : (a, b) => a.name.localeCompare(b.name);

  const boroCounts = cafes.reduce((m, c) => ((m[c.borough] = (m[c.borough] || 0) + 1), m), {});
  const gridList = searched.filter((c) => boro === "All" || c.borough === boro).sort(sorter);

  const DIR_SORTS = {
    name: (a, b) => a.name.localeCompare(b.name),
    hood: (a, b) => a.hood.localeCompare(b.hood) || a.name.localeCompare(b.name),
    wifi: (a, b) => (b.wifi + b.secured) - (a.wifi + a.secured) || a.name.localeCompare(b.name),
    outlets: (a, b) => b.outlets - a.outlets || a.name.localeCompare(b.name),
    food: (a, b) => b.hotFood - a.hotFood || a.name.localeCompare(b.name),
    restroom: (a, b) => b.restroom - a.restroom || a.name.localeCompare(b.name),
    seats: (a, b) => { const o = { Ample: 0, Many: 1, Some: 2, Few: 3 }; return (o[a.seats] ?? 4) - (o[b.seats] ?? 4) || a.name.localeCompare(b.name); },
    limit: (a, b) => (a.limit === "No limit" ? 0 : 1) - (b.limit === "No limit" ? 0 : 1) || a.name.localeCompare(b.name),
  };
  const dirList = [...searched].sort(DIR_SORTS[dirSort]);
  const hovered = hover || dirList[0] || null;

  const activeNeeds = NEEDS.filter((n) => needs.has(n.key));
  const mapList = searched.filter((c) => activeNeeds.every((n) => n.test(c))).sort(sorter);
  const mapRows = mapList.map((c) => c.raw); // MapComponent re-plots only when the set of cafés changes

  const toggleNeed = (key) => setNeeds((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const countLabel = view === "map" ? mapList.length : view === "dir" ? dirList.length : gridList.length;
  const where = view === "grid" && boro !== "All" ? boro : "NYC";

  return (
    <div className="home">
      <Navbar />
      <main className="home__wrap">
        {/* hero */}
        <div className="home__hero">
          <h1 className="home__greet">
            {greeting()}{name && <>, <b>{name}</b></>}.<br />Where are we working today?
          </h1>

        </div>

        {/* find your next desk */}
        <div className="home__head">
          <h2>Indie cafés, fully scouted. New every Monday.</h2>
        </div>
        <div className="home__toolbar">
          <div className="home__seg" role="tablist" aria-label="View">
            {VIEWS.map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={view === k} className={view === k ? "is-on" : ""} onClick={() => setView(k)}>{label}</button>
            ))}
          </div>
          <label className="home__search">
            <span aria-hidden="true">⌕</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search cafés, boroughs, zipcodes…" aria-label="Search cafés" autoComplete="off" />
          </label>
          <div className="home__pills">
            <button
              type="button"
              className={`home__pill ${openOnly ? "is-active" : ""}`}
              aria-pressed={openOnly}
              onClick={() => setOpenOnly((v) => !v)}
              title={withHours ? `Hours on file for ${withHours} of ${cafes.length} cafés` : "No café hours on file yet"}
            >
              {openOnly ? "✓ " : ""}Open now
            </button>
            <div className="home__sort" ref={sortRef}>
              <button type="button" className="home__pill is-on" aria-haspopup="listbox" aria-expanded={sortOpen} onClick={() => setSortOpen((v) => !v)}>
                Sort: {locating ? "Locating…" : SORTS[sort]} ▾
              </button>
              {sortOpen && (
                <ul className="home__menu" role="listbox">
                  {Object.entries(SORTS).map(([k, label]) => (
                    <li key={k}><button type="button" role="option" aria-selected={sort === k} className={sort === k ? "is-on" : ""} onClick={() => chooseSort(k)}>{label}{k === "near" ? " (uses your location)" : ""}</button></li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* map strip */}
        {view !== "map" && <MapStrip cafes={cafes} onOpen={() => setView("map")} />}

        <div className="home__head">
          <h2 aria-live="polite">{loading ? "Loading cafés…" : `${countLabel} café${countLabel === 1 ? "" : "s"} · ${where}${q ? ` · “${query.trim()}”` : ""}`}</h2>
          {openOnly && (
            <small>{withHours ? `Showing cafés open right now · ${cafes.length - withHours} without hours on file are hidden` : "No café hours on file yet, so nothing can be shown as open"}</small>
          )}
        </div>

        {/* ── GRID ── */}
        {view === "grid" && (
          <section aria-label="Café cards">
            <div className="home__tabsrow">
              <div className="home__tabs" role="tablist" aria-label="Borough">
                {BOROUGHS.map((b) => (
                  <button key={b} type="button" role="tab" aria-selected={boro === b} className={boro === b ? "is-on" : ""} onClick={() => setBoro(b)}>
                    <i style={{ background: b === "All" ? "#F5F2EC" : BORO_COLORS[b] }} />{b}<em>{b === "All" ? cafes.length : boroCounts[b] || 0}</em>
                  </button>
                ))}
              </div>
              <small className="home__checked">Every café checked in person for Wi‑Fi, outlets, hot food, restroom, seating and time limits</small>
            </div>
            <div className="home__grid">
              {gridList.map((c) => <CafeCard key={c.id} cafe={c} onOpen={setOpen} />)}
              {!loading && !gridList.length && <p className="home__empty">No cafés match. Clear the search or pick another borough.</p>}
            </div>
          </section>
        )}

        {/* ── DIRECTORY ── */}
        {view === "dir" && (
          <section className="home__dir" aria-label="Café directory">
            <div className="home__tablewrap">
              <table className="home__table">
                <thead>
                  <tr>
                    <th aria-label="Photo" />
                    {[["name", "Café"], ["hood", "Neighborhood"], ["wifi", "Wi‑Fi"], ["outlets", "Outlets"], ["food", "Food"], ["restroom", "Restroom"], ["seats", "Seating"], ["limit", "Limit"]].map(([k, label]) => (
                      <th key={k} aria-sort={dirSort === k ? "ascending" : "none"}>
                        <button type="button" className={dirSort === k ? "is-on" : ""} onClick={() => setDirSort(k)}>{label}{dirSort === k ? " ↑" : ""}</button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dirList.map((c) => (
                    <tr key={c.id} className={hovered?.id === c.id ? "is-hl" : ""} onMouseEnter={() => setHover(c)} onFocus={() => setHover(c)} onClick={() => setOpen(c)} tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter") setOpen(c); }}>
                      <td><img src={c.photo} alt="" loading="lazy" className="home__thumb" /></td>
                      <td className="home__td-name">{c.name}</td>
                      <td className="home__td-hood"><i style={{ background: BORO_COLORS[c.borough] }} />{locationLabel(c)}</td>
                      <td>{c.wifi ? (c.secured ? "Secured" : "Open") : <span className="is-no">—</span>}</td>
                      <td>{c.outlets ? <span className="is-yes">Yes</span> : <span className="is-no">No</span>}</td>
                      <td>{c.hotFood ? <span className="is-yes">Yes</span> : <span className="is-no">No</span>}</td>
                      <td>{c.restroom ? <span className="is-yes">Yes</span> : <span className="is-no">No</span>}</td>
                      <td>{c.seats}</td>
                      <td className="home__td-limit">{c.limit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && !dirList.length && <p className="home__empty">No cafés match. Clear the search to see the directory.</p>}
            </div>
            <aside className="home__side">
              {hovered ? (
                <div className="home__hov">
                  <div className="home__k">{hover ? "Hovered café" : "First in the list"}</div>
                  <div className="home__hov-name">{hovered.name}</div>
                  <div className="home__hov-addr">{locationLabel(hovered)}</div>
                  <div className="home__hov-photo"><img src={hovered.photo} alt="" />{!hovered.realPhoto && <span className="cafe-card__sample">Sample photo</span>}</div>
                  <p>{hovered.desc ? shortDesc(hovered, 160) : "Description coming soon."}</p>
                  <div className="home__hov-by"><ScoutAvatar name={hovered.scout} size="sm" />Visited by {hovered.scout === TEAM_SCOUT ? "the scout team" : hovered.scout}</div>
                  <button type="button" className="home__btn" onClick={() => setOpen(hovered)}>Open details</button>
                </div>
              ) : <div className="home__hov"><div className="home__k">No matches</div><p>Clear the search to see the directory.</p></div>}
            </aside>
          </section>
        )}

        {/* ── MAP ── */}
        {view === "map" && (
          <section aria-label="Café map">
            <div className="home__needs" role="group" aria-label="What do you need?">
              {NEEDS.map((n) => (
                <button key={n.key} type="button" className={`home__need ${needs.has(n.key) ? "is-on" : ""}`} aria-pressed={needs.has(n.key)} onClick={() => toggleNeed(n.key)}>
                  <NeedIcon k={n.key} />
                  <span><b>{n.label}</b><small>{searched.filter(n.test).length} cafés</small></span>
                </button>
              ))}
            </div>
            <div className="home__match">
              <b>{mapList.length}</b> of {cafes.length} cafés match{activeNeeds.length ? ` · ${activeNeeds.map((n) => n.label).join(" + ")}` : ""}
            </div>
            <div className="home__map">
              <MapComponent cafes={mapRows} onMarkerClick={(row) => { const c = cafes.find((x) => x.id === `${row.Name?.trim()}|${(row.Address || "").trim()}`); if (c) setOpen(c); }} userCoords={coords} />
            </div>
            <div className="home__mcards">
              {mapList.slice(0, 16).map((c) => (
                <button key={c.id} type="button" className="home__mc" onClick={() => setOpen(c)}>
                  <img src={c.photo} alt="" loading="lazy" />
                  <span>
                    <span className="home__mc-name">{c.name}</span>
                    <span className="home__mc-hood">{locationLabel(c)}</span>
                    <span className="home__mc-st">{wifiLabel(c)} · {c.seats} seating · {c.limit}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <section className="home__postcards" aria-label="Scout postcards">
        <div className="home__wrap"><ScoutPostcards /></div>
      </section>

      <CafePanel cafe={open} onClose={() => setOpen(null)} />
      <SiteFooter />
    </div>
  );
}

function NeedIcon({ k }) {
  const paths = {
    outlets: <path d="M9 2v6M15 2v6M6 8h12l-1 5a5 5 0 0 1-10 0zM12 18v4" />,
    secured: <path d="M5 11V7a7 7 0 0 1 14 0v4M4 11h16v10H4z" />,
    nolimit: <path d="M12 3a9 9 0 1 0 9 9M12 7v5l3 2M17 3l4 4M21 3l-4 4" />,
    food: <path d="M4 3v18M4 3c0 4 3 4 3 4s3 0 3-4M7 7v14M16 3c-2 0-3 3-3 6s1 4 3 4v8" />,
    restroom: <><circle cx="12" cy="5" r="2" /><path d="M8 10h8l-2 5h-4zM10 15v6M14 15v6" /></>,
    seats: <path d="M6 11V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6M4 13a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4H4zM6 17v3M18 17v3" />,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">{paths[k]}</svg>;
}
