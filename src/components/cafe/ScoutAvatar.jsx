import { SCOUT_THUMBS } from "../../lib/cafes";

// Round scout photo (or a coffee cup for the team as a whole).
export default function ScoutAvatar({ name, size = "md" }) {
  const src = SCOUT_THUMBS[name];
  return (
    <span className={`scout-av scout-av--${size}`} aria-hidden="true">
      {src ? <img src={src} alt="" loading="lazy" /> : <span>☕</span>}
    </span>
  );
}
