import { useMemo, useRef, useState } from "react";
import { BORO_DARK, TEAM_SCOUT, locationLabel, shortDesc, useCafes } from "../../lib/cafes";
import ScoutAvatar from "./ScoutAvatar";
import CafePanel from "./CafePanel";
import "./Cafe.css";

const TILTS = [-2, 1.5, -1, 2];

// Postcards from the scouts: one per café, filterable by who visited.
export default function ScoutPostcards() {
  const { cafes } = useCafes();
  const [scout, setScout] = useState("All");
  const [open, setOpen] = useState(null);
  const rail = useRef(null);

  const scouts = useMemo(() => {
    const counts = {};
    cafes.forEach((c) => { if (c.scout !== TEAM_SCOUT) counts[c.scout] = (counts[c.scout] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [cafes]);

  const list = useMemo(
    () => cafes
      .filter((c) => scout === "All" || c.scout === scout)
      .sort((a, b) => (b.realPhoto - a.realPhoto) || a.name.localeCompare(b.name))
      .slice(0, 30),
    [cafes, scout]
  );

  if (!cafes.length) return null;

  const scroll = (dir) => rail.current?.scrollBy({ left: dir * 364, behavior: "smooth" });
  const pick = (s) => { setScout(s); if (rail.current) rail.current.scrollLeft = 0; };

  return (
    <section className="postcards" aria-label="Scout postcards">
      <div className="postcards__head">
        <div>
          <div className="postcards__k">From the scout team</div>
          <h2 className="postcards__title">Postcards from every café<br />we've actually sat in.</h2>
        </div>
        <div className="postcards__arrows">
          <button type="button" onClick={() => scroll(-1)} aria-label="Previous postcards">←</button>
          <button type="button" className="is-primary" onClick={() => scroll(1)} aria-label="Next postcards">→</button>
        </div>
      </div>

      <div className="postcards__scouts" role="tablist" aria-label="Filter by scout">
        <button type="button" role="tab" aria-selected={scout === "All"} className={scout === "All" ? "is-on" : ""} onClick={() => pick("All")}>
          <ScoutAvatar name={null} />All <em>{cafes.length}</em>
        </button>
        {scouts.map(([name, n]) => (
          <button key={name} type="button" role="tab" aria-selected={scout === name} className={scout === name ? "is-on" : ""} onClick={() => pick(name)}>
            <ScoutAvatar name={name} />{name} <em>{n}</em>
          </button>
        ))}
      </div>

      <div className="postcards__rail" ref={rail}>
        {list.map((c, k) => (
          <button key={c.id} type="button" className="postcard" style={{ "--tilt": `${TILTS[k % 4]}deg` }} onClick={() => setOpen(c)} aria-label={`Open ${c.name}`}>
            <span className="postcard__photo">
              <img src={c.photo} alt="" loading="lazy" decoding="async" />
              {!c.realPhoto && <span className="cafe-card__sample">Sample photo</span>}
              <span className="postcard__stamp">SCOUTED<br /><span>NYC</span></span>
            </span>
            <span className="postcard__body">
              <span className="postcard__top">
                <span>
                  <span className="postcard__name">{c.name}</span>
                  <span className="postcard__hood">{locationLabel(c)}</span>
                </span>
                <span className="postcard__boro" style={{ background: BORO_DARK[c.borough] || "#555" }}>{c.borough}</span>
              </span>
              <span className="postcard__quote">“{c.desc ? shortDesc(c) : "Scout note coming soon."}”</span>
              <span className="postcard__am">
                <span><i className={c.wifi ? "is-on" : ""} />Wi‑Fi {c.wifi ? (c.secured ? "secured" : "open") : ""}</span>
                <span><i className={c.outlets ? "is-on" : ""} />Outlets</span>
                <span><i className={c.hotFood ? "is-on" : ""} />Hot food</span>
                <span><i className={c.restroom ? "is-on" : ""} />Restroom</span>
                <span>Seating · <b>{c.seats}</b></span>
                <span>Time limit · <b>{c.limit}</b></span>
              </span>
              <span className="postcard__foot">
                <span className="postcard__by"><ScoutAvatar name={c.scout} size="sm" />Visited by {c.scout === TEAM_SCOUT ? "the team" : c.scout}</span>
                <span className="postcard__open">Open →</span>
              </span>
            </span>
          </button>
        ))}
      </div>

      <CafePanel cafe={open} onClose={() => setOpen(null)} />
    </section>
  );
}
