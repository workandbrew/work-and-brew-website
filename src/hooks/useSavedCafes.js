import { useState, useEffect } from "react";

const KEY = (uid) => `wb_saved_cafes_${uid}`;

export function useSavedCafes(username) {
  const [savedCafes, setSavedCafes] = useState(() => {
    if (!username) return [];
    try {
      const stored = localStorage.getItem(KEY(username));
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!username) return;
    localStorage.setItem(KEY(username), JSON.stringify(savedCafes));
  }, [savedCafes, username]);

  const saveCafe = (cafe) => {
    setSavedCafes((prev) => {
      const alreadySaved = prev.some((c) => c.Name === cafe.Name && c.Address === cafe.Address);
      if (alreadySaved) return prev;
      return [...prev, cafe];
    });
  };

  const removeCafe = (cafe) => {
    setSavedCafes((prev) =>
      prev.filter((c) => !(c.Name === cafe.Name && c.Address === cafe.Address))
    );
  };

  const isSaved = (cafe) =>
    savedCafes.some((c) => c.Name === cafe.Name && c.Address === cafe.Address);

  return { savedCafes, saveCafe, removeCafe, isSaved };
}
