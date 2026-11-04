import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import Layout from "./components/Layout";
import useWatchlist from "./hooks/useWatchlist";
import Assistant from "./pages/Assistant";
import Breakouts from "./pages/Breakouts";
import Compare from "./pages/Compare";
import DataHealth from "./pages/DataHealth";
import Dashboard from "./pages/Dashboard";
import Lab3D from "./pages/Lab3D";
import Methods from "./pages/Methods";
import PlayerProfile from "./pages/PlayerProfile";
import Replace from "./pages/Replace";
import Players from "./pages/Players";
import Report from "./pages/Report";
import ScatterLab from "./pages/ScatterLab";
import Styles from "./pages/Styles";
import Teams from "./pages/Teams";
import TeamOfSeason from "./pages/TeamOfSeason";
import Watchlist from "./pages/Watchlist";
import Awards from "./pages/Awards";
import Forecast from "./pages/Forecast";
import Guess from "./pages/Guess";
import Race from "./pages/Race";
import XIBuilder from "./pages/XIBuilder";
import MatchLab from "./pages/MatchLab";

export default function App() {
  const [selected, setSelected] = useState([]);
  const [watch, setWatch] = useWatchlist();

  function toggle(key) {
    setSelected((current) => {
      if (current.includes(key)) return current.filter((k) => k !== key);
      if (current.length >= 4) return current;
      return [...current, key];
    });
  }

  function toggleWatch(key) {
    setWatch((current) => {
      if (current[key]) {
        const { [key]: removed, ...rest } = current;
        return rest;
      }
      return { ...current, [key]: { note: "", tag: "Monitor", added: new Date().toISOString().slice(0, 10) } };
    });
  }

  function updateWatch(key, patch) {
    setWatch((current) => (current[key] ? { ...current, [key]: { ...current[key], ...patch } } : current));
  }

  const watchProps = { watch, onWatch: toggleWatch };

  return (
    <Routes>
      <Route element={<Layout selectedCount={selected.length} watchCount={Object.keys(watch).length} />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/players" element={<Players selected={selected} onToggle={toggle} {...watchProps} />} />
        <Route path="/player/:pid" element={<PlayerProfile selected={selected} onToggle={toggle} {...watchProps} />} />
        <Route path="/compare" element={<Compare selected={selected} onToggle={toggle} />} />
        <Route path="/lab" element={<ScatterLab />} />
        <Route path="/lab3d" element={<Lab3D />} />
        <Route path="/styles" element={<Styles />} />
        <Route path="/team-of-the-season" element={<TeamOfSeason />} />
        <Route path="/breakouts" element={<Breakouts />} />
        <Route path="/replace" element={<Replace />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/data-health" element={<DataHealth />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/watchlist" element={<Watchlist selected={selected} onToggle={toggle} watch={watch} onWatch={toggleWatch} onUpdate={updateWatch} />} />
        <Route path="/report/:pid" element={<Report watch={watch} />} />
        <Route path="/matches" element={<MatchLab />} />
        <Route path="/xi" element={<XIBuilder />} />
        <Route path="/forecast" element={<Forecast />} />
        <Route path="/guess" element={<Guess />} />
        <Route path="/race" element={<Race />} />
        <Route path="/awards" element={<Awards />} />
        <Route path="/methods" element={<Methods />} />
      </Route>
    </Routes>
  );
}
