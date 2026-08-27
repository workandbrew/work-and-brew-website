import { useState, useEffect } from "react";

const KEY    = (uid)  => `wb_notes_${uid}`;
const noteId = (cafe) => `${cafe.Name}__${cafe.Address}`;

/**
 * Per-café personal notes, stored locally per user.
 * Returns getNote(cafe) and setNote(cafe, text).
 */
export function useCafeNotes(username) {
  const [notes, setNotes] = useState(() => {
    if (!username) return {};
    try { return JSON.parse(localStorage.getItem(KEY(username)) || "{}"); }
    catch { return {}; }
  });

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(KEY(username), JSON.stringify(notes));
  }, [notes, username]);

  return {
    getNote: (cafe) => notes[noteId(cafe)] || "",
    setNote: (cafe, text) =>
      setNotes((prev) => ({ ...prev, [noteId(cafe)]: text })),
  };
}
