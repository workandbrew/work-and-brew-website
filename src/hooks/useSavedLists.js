import { useState, useEffect, useMemo } from "react";

const KEY     = (uid) => `wb_saved_lists_${uid}`;
const OLD_KEY = (uid) => `wb_saved_cafes_${uid}`; // migrate from flat saves if present

const sameCafe = (a, b) => a.Name === b.Name && a.Address === b.Address;

function loadLists(username) {
  if (!username) return [{ id: 1, name: "My Favorites", cafes: [] }];

  let lists;
  try {
    const stored = localStorage.getItem(KEY(username));
    lists = stored ? JSON.parse(stored) : null;
  } catch {
    lists = null;
  }

  if (!lists || !lists.length) {
    lists = [{ id: 1, name: "My Favorites", cafes: [] }];
  }

  // Fold any existing flat saves into the first list (migration)
  try {
    const oldSaves = JSON.parse(localStorage.getItem(OLD_KEY(username)) || "[]");
    oldSaves.forEach((cafe) => {
      const alreadyInAList = lists.some((l) => l.cafes.some((c) => sameCafe(c, cafe)));
      if (!alreadyInAList) lists[0].cafes.push(cafe);
    });
  } catch {
    // nothing to migrate
  }

  return lists;
}

export function useSavedLists(username) {
  const [lists, setLists] = useState(() => loadLists(username));

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(KEY(username), JSON.stringify(lists));
  }, [lists, username]);

  const createList = (name) => {
    setLists((prev) => [...prev, { id: Date.now(), name, cafes: [] }]);
  };

  // always keep at least one list around
  const deleteList = (id) => {
    setLists((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  };

  const removeCafeFromList = (listId, cafe) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId ? { ...l, cafes: l.cafes.filter((c) => !sameCafe(c, cafe)) } : l
      )
    );
    // keep the map page's save button in sync
    try {
      const oldSaves = JSON.parse(localStorage.getItem(OLD_KEY(username)) || "[]");
      localStorage.setItem(OLD_KEY(username), JSON.stringify(oldSaves.filter((c) => !sameCafe(c, cafe))));
    } catch {
      // fine
    }
  };

  // every saved café across all lists, deduped — feeds the dashboard map
  const allCafes = useMemo(() => {
    const seen = [];
    lists.forEach((l) =>
      l.cafes.forEach((cafe) => {
        if (!seen.some((c) => sameCafe(c, cafe))) seen.push(cafe);
      })
    );
    return seen;
  }, [lists]);

  return { lists, allCafes, createList, deleteList, removeCafeFromList };
}
