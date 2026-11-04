import { useEffect, useState } from "react";

// "dark" is the default look; the choice is remembered in the browser.
export default function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("vsiq-theme") || "dark"; } catch { return "dark"; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("vsiq-theme", theme); } catch { /* storage blocked: still works for this visit */ }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))];
}
