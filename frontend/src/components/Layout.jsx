import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import CommandPalette from "./CommandPalette";
import TopNav from "./TopNav";
import useTheme from "../hooks/useTheme";

export default function Layout({ selectedCount, watchCount }) {
  const { pathname } = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [theme, toggleTheme] = useTheme();

  useEffect(() => {
    const bar = document.documentElement;
    const onScroll = () => {
      const max = bar.scrollHeight - bar.clientHeight;
      bar.style.setProperty("--scroll", max > 0 ? String(bar.scrollTop / max) : "0");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Panels below the fold glide in the first time they scroll into view.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("rv-in"); io.unobserve(en.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    const t = setTimeout(() => {
      document.querySelectorAll(".route .panel, .route .explore-tile, .route .stat-strip, .route .award, .route .xi-stats").forEach((el) => {
        if (el.getBoundingClientRect().top > window.innerHeight * 0.95) { el.classList.add("rv"); io.observe(el); }
      });
    }, 60);
    return () => { clearTimeout(t); io.disconnect(); };
  }, [pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <TopNav selectedCount={selectedCount} watchCount={watchCount} onSearch={() => setSearchOpen(true)} theme={theme} onTheme={toggleTheme} />
      <div className="scroll-progress" aria-hidden="true" />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
      <main className="page">
        <div key={pathname} className="route"><Outlet /></div>
        <div key={`w${pathname}`} className="route-wipe" aria-hidden="true" />
        <footer className="footer">
          <div className="footer-brand"><span className="brand-mark small">V</span><div><strong>Villegas Analytics</strong><small>Villegas Scout IQ (VSIQ)</small></div></div>
          <span>Data from Understat. Totals cover completed league seasons only. Built by Juan Villegas.</span>
        </footer>
      </main>
    </>
  );
}
