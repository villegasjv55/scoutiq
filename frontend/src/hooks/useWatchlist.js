import { useEffect, useState } from "react";

const STORAGE_KEY = "vsiq-watchlist-v1";

// Watchlist saved in this browser only: { [playerKey]: { note, tag, added } }
export default function useWatchlist() {
  const [watch, setWatch] = useState(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(watch));
    } catch {
      /* storage can be blocked; the watchlist then lives only until the page closes */
    }
  }, [watch]);

  return [watch, setWatch];
}
