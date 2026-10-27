import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Which team-only pages the logged-in user may see: { map, hub }.
// The server decides (team_access + hub_admins tables), so no email list ships to the browser.
const NONE = { map: false, hub: false };
const cacheKey = (id) => `wb_team_access_${id}`;

export function useTeamAccess(user) {
  const id = user?.id;
  const [access, setAccess] = useState(() => {
    if (!id) return NONE;
    try { return JSON.parse(sessionStorage.getItem(cacheKey(id))) || NONE; } catch { return NONE; }
  });

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) return;
      const r = await fetch("/api/hub?access=1", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
      const json = r ? await r.json().catch(() => null) : null;
      if (!alive || !json?.ok) return;
      const next = { map: !!json.map, hub: !!json.hub };
      setAccess(next);
      try { sessionStorage.setItem(cacheKey(id), JSON.stringify(next)); } catch { /* private mode */ }
    })();
    return () => { alive = false; };
  }, [id]);

  return id ? access : NONE;
}
