import { useMemo, useState } from "react";
import { leagueNames, players, seasonOptions } from "../data/store";
import PageHeader from "../components/PageHeader";
import PlayerTable from "../components/PlayerTable";
import SelectField from "../components/SelectField";
import { SORT_OPTIONS } from "../utils/metrics";

const PAGE_SIZE = 40;
const POSITIONS = ["All positions", "Forward", "Midfielder", "Defender"];
const MINUTES = [
  { value: "450", label: "450+ minutes" },
  { value: "900", label: "900+ minutes" },
  { value: "1800", label: "1,800+ minutes" },
];

export default function Players({ selected, onToggle, watch, onWatch }) {
  const [search, setSearch] = useState("");
  const [season, setSeason] = useState(String(seasonOptions[0].value));
  const [league, setLeague] = useState("All leagues");
  const [position, setPosition] = useState("All positions");
  const [minutes, setMinutes] = useState("450");
  const [sortKey, setSortKey] = useState("goals");
  const [visible, setVisible] = useState(PAGE_SIZE);

  function change(setter) {
    return (value) => {
      setter(value);
      setVisible(PAGE_SIZE);
    };
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return players
      .filter((p) => {
        if (season !== "all" && p.season !== Number(season)) return false;
        if (league !== "All leagues" && p.league !== league) return false;
        if (position !== "All positions" && p.position !== position) return false;
        if (p.minutes < Number(minutes)) return false;
        return !term || p.name.toLowerCase().includes(term) || p.club.toLowerCase().includes(term);
      })
      .sort((a, b) => b[sortKey] - a[sortKey]);
  }, [search, season, league, position, minutes, sortKey]);

  return (
    <>
      <PageHeader
        title="Players"
        description="Search every player with at least 450 league minutes. Pick up to four rows to compare, including the same player in different seasons."
      />
      <section className="panel">
        <div className="controls">
          <label className="field grow">
            <span>Search</span>
            <input type="search" placeholder="Player or club" value={search} onChange={(e) => change(setSearch)(e.target.value)} />
          </label>
          <SelectField label="Season" value={season} onChange={change(setSeason)} options={[{ value: "all", label: "All seasons" }, ...seasonOptions.map((s) => ({ value: String(s.value), label: s.label }))]} />
          <SelectField label="League" value={league} onChange={change(setLeague)} options={["All leagues", ...leagueNames]} />
          <SelectField label="Position" value={position} onChange={change(setPosition)} options={POSITIONS} />
          <SelectField label="Minutes" value={minutes} onChange={change(setMinutes)} options={MINUTES} />
          <SelectField label="Sort by" value={sortKey} onChange={change(setSortKey)} options={SORT_OPTIONS} />
        </div>
        <p className="result-count">
          {filtered.length.toLocaleString()} players found. {selected.length}/4 selected for comparison.
        </p>
        <PlayerTable players={filtered.slice(0, visible)} selected={selected} onToggle={onToggle} watch={watch} onWatch={onWatch} />
        {visible < filtered.length && (
          <div className="load-more">
            <button className="btn ghost" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
              Show {Math.min(PAGE_SIZE, filtered.length - visible)} more
            </button>
          </div>
        )}
      </section>
    </>
  );
}
