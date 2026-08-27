import { useState } from "react";

const KEY = (uid) => `wb_perm_${uid}`;

/**
 * Tracks whether the user has granted permission to save their data.
 * Values: "granted" | "denied" | null (never answered)
 */
export function usePermission(username) {
  const [permission, setPermission] = useState(() => {
    if (!username) return null;
    return localStorage.getItem(KEY(username)); // "granted" | "denied" | null
  });

  const grant = () => {
    if (!username) return;
    localStorage.setItem(KEY(username), "granted");
    setPermission("granted");
  };

  const deny = () => {
    if (!username) return;
    localStorage.setItem(KEY(username), "denied");
    setPermission("denied");
  };

  return { permission, grant, deny };
}
