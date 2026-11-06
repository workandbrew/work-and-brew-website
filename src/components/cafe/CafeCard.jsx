import { hoursToday, isOpenAt, locationLabel, statLine } from "../../lib/cafes";

// "02 Geometric overlay": full-bleed photo, display caps name on a navy gradient,
// light sans for everything else. Open / closed tag top-left when the café has hours on file.
export default function CafeCard({ cafe, onOpen }) {
  const open = isOpenAt(cafe);
  return (
    <button type="button" className="cafe-card" onClick={() => onOpen(cafe)} aria-label={cafe.name}>
      <img className="cafe-card__photo" src={cafe.photo} alt="" loading="lazy" decoding="async" />
      {!cafe.realPhoto && <span className="cafe-card__sample">Sample photo</span>}
      {open !== null && (
        <span className={`cafe-card__open ${open ? "is-open" : ""}`}>{open ? "Open now" : "Closed"}{hoursToday(cafe) ? ` · ${hoursToday(cafe)}` : ""}</span>
      )}
      <span className="cafe-card__overlay">
        <span className="cafe-card__name">{cafe.name}</span>
        <span className="cafe-card__hood">{locationLabel(cafe)}</span>
        <span className="cafe-card__stats">{statLine(cafe)}</span>
      </span>
    </button>
  );
}
