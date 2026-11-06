import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

// Team Hub notifications for hub admins: announcements, texts sent, texts going out tomorrow, sign-ups,
// events, replies. "Seen" is remembered per device, so each person's badge clears on their own phone/laptop.
const SEEN_KEY = "wb-notif-seen";
const readSeen = () => { try { return localStorage.getItem(SEEN_KEY) || ""; } catch { return ""; } };

async function fetchItems() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return null;
  const r = await fetch("/api/hub?notifications=1", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  const json = r ? await r.json().catch(() => null) : null;
  return json?.ok ? json.items : null;
}

const when = (iso) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [seen, setSeen] = useState(readSeen);
  const [open, setOpen] = useState(false);
  const [highlightAfter, setHighlightAfter] = useState("");
  const box = useRef(null);
  const navigate = useNavigate();

  // Load now, then every 2 minutes while the tab is in front
  useEffect(() => {
    let alive = true;
    const tick = () => { if (document.visibilityState === "visible") fetchItems().then((list) => { if (alive && list) setItems(list); }); };
    tick();
    const t = setInterval(tick, 120000);
    document.addEventListener("visibilitychange", tick);
    return () => { alive = false; clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, []);

  // Close when tapping outside
  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [open]);

  const unread = items.filter((i) => i.at > seen).length;
  const markSeen = () => {
    const now = new Date().toISOString();
    try { localStorage.setItem(SEEN_KEY, now); } catch { /* private mode */ }
    setSeen(now);
  };
  const toggle = () => {
    if (open) { setOpen(false); return; }
    setHighlightAfter(seen); // keep the new ones highlighted while the list is open
    setOpen(true);
    markSeen();
  };
  const go = (link) => { setOpen(false); if (link) navigate(link); };

  return (
    <div className="nb" ref={box}>
      <button type="button" className="nb-btn" onClick={toggle} aria-label={unread ? `Notifications, ${unread} new` : "Notifications"} aria-expanded={open}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && <span className="nb-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="nb-panel" role="dialog" aria-label="Team Hub notifications">
          <div className="nb-head"><b>Notifications</b><span>Last 2 weeks</span></div>
          {!items.length ? <p className="nb-empty">Nothing yet. Updates from the Team Hub show up here.</p> : (
            <ul className="nb-list">
              {items.map((i) => (
                <li key={i.id} className={i.at > highlightAfter ? "new" : ""}>
                  <button type="button" onClick={() => go(i.link)}>
                    <span className={`nb-ic nb-${i.kind}`} aria-hidden="true" />
                    <span className="nb-txt">{i.text}<small>{when(i.at)}</small></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
