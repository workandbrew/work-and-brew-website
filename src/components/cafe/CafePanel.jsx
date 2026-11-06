import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BORO_DARK, TEAM_SCOUT, hoursToday, locationLabel } from "../../lib/cafes";
import { useAuth } from "../../context/AuthContext";
import { useSavedCafes } from "../../hooks/useSavedCafes";
import SuggestionForm from "../SuggestionForm";
import ScoutAvatar from "./ScoutAvatar";

// Café details, sliding in from the right over any page.
export default function CafePanel({ cafe, onClose }) {
  const { user } = useAuth();
  const { saveCafe, removeCafe, isSaved } = useSavedCafes(user?.username);
  const navigate = useNavigate();
  const closeRef = useRef(null);

  useEffect(() => {
    if (!cafe) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [cafe, onClose]);

  if (!cafe) return null;
  const row = cafe.raw;
  const saved = user && isSaved(row);

  const handleSave = () => {
    if (!user) { navigate("/login"); return; }
    if (isSaved(row)) removeCafe(row); else saveCafe(row);
  };

  const cell = (label, value) => (
    <div className="cafe-panel__cell"><span>{label}</span><b>{value}</b></div>
  );

  return (
    <>
      <div className="cafe-scrim" onClick={onClose} aria-hidden="true" />
      <aside className="cafe-panel" role="dialog" aria-modal="true" aria-label={`${cafe.name} details`}>
        <button ref={closeRef} type="button" className="cafe-panel__close" onClick={onClose} aria-label="Close café details">✕</button>
        <div className="cafe-panel__photo">
          <img src={cafe.photo} alt={cafe.realPhoto ? `${cafe.name} interior` : ""} />
          {!cafe.realPhoto && <span className="cafe-card__sample">Sample photo</span>}
        </div>
        <h2 className="cafe-panel__name">{cafe.name}</h2>
        <p className="cafe-panel__addr">{cafe.address}</p>
        <span className="cafe-panel__boro" style={{ background: BORO_DARK[cafe.borough] || "#555" }}>{cafe.borough}</span>
        {cafe.locations > 1 && <p className="cafe-panel__locs">{cafe.locations} locations in NYC</p>}

        {cafe.desc && (
          <>
            <div className="cafe-panel__rule" />
            <p className="cafe-panel__k">The story</p>
            <p className="cafe-panel__about">{cafe.desc}</p>
          </>
        )}

        <div className="cafe-panel__rule" />
        <div className="cafe-panel__grid">
          {cell("Wi‑Fi", cafe.wifi ? "Yes" : "No")}
          {cell("Secured", cafe.secured ? "Yes" : "No")}
          {cell("Outlets", cafe.outlets ? "Yes" : "No")}
          {cell("Hot food", cafe.hotFood ? "Yes" : "No")}
          {cell("Restroom", cafe.restroom ? "Yes" : "No")}
          {cell("Seating", cafe.seats)}
          {cell("Time limit", cafe.limit)}
          {cell("Hours today", hoursToday(cafe) || "Not collected yet")}
        </div>

        <div className="cafe-panel__rule" />
        <div className="cafe-panel__btns">
          <a
            className="cafe-panel__btn cafe-panel__btn--primary"
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(cafe.address || `${cafe.name} ${locationLabel(cafe)} NY`)}`}
            target="_blank" rel="noopener noreferrer"
          >
            Get directions
          </a>
          <button type="button" className={`cafe-panel__btn ${saved ? "is-saved" : ""}`} onClick={handleSave}>
            {saved ? "♥ Saved" : user ? "♡ Save café" : "♡ Log in to save"}
          </button>
        </div>

        <p className="cafe-panel__scout cafe-panel__scout--foot">
          <ScoutAvatar name={cafe.scout} size="sm" />
          Visited by {cafe.scout === TEAM_SCOUT ? "the Work & Brew scout team" : cafe.scout}
        </p>

        <SuggestionForm cafeName={cafe.name} />
      </aside>
    </>
  );
}
