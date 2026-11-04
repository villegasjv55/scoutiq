import { describe, expect, it } from "vitest";
import { fmt, initials, ordinal, pctColor, signed } from "./metrics";
import { cardTier, vsiqRating } from "./rating";
import { parseQuery, runQuery } from "./assistant";

describe("formatting helpers", () => {
  it("formats numbers", () => {
    expect(fmt(3.14159, 2)).toBe("3.14");
    expect(fmt(null)).toBe("-");
    expect(signed(1.26)).toBe("+1.3");
    expect(signed(-2)).toBe("-2.0");
  });
  it("builds ordinals and initials", () => {
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(12)).toBe("12th");
    expect(ordinal(93)).toBe("93rd");
    expect(initials("Kylian Mbappe-Lottin")).toBe("KM");
  });
  it("keeps percentile colours in range", () => {
    expect(pctColor(0)).toMatch(/^rgb\(/);
    expect(pctColor(100)).toBe("rgb(211,255,100)");
    expect(pctColor(500)).toBe("rgb(211,255,100)");
  });
});

describe("VSIQ rating", () => {
  const all = (n) => ({ pct: { goals90: n, assists90: n, xG90: n, xA90: n, shots90: n, keyPasses90: n, xGChain90: n, xGBuildup90: n } });
  it("averages the eight percentiles", () => {
    expect(vsiqRating(all(80))).toBe(80);
    expect(vsiqRating({ pct: {} })).toBe(0);
  });
  it("assigns card tiers", () => {
    expect(cardTier(90)).toBe("elite");
    expect(cardTier(75)).toBe("gold");
    expect(cardTier(60)).toBe("silver");
    expect(cardTier(10)).toBe("bronze");
  });
});

describe("Scout IQ assistant", () => {
  const seasons = [{ value: 2024, label: "2024-25" }, { value: 2023, label: "2023-24" }];
  it("reads position, league, season and ranking", () => {
    const parsed = parseQuery("Creative midfielders in La Liga 2023-24", seasons);
    expect(parsed.position).toBe("Midfielder");
    expect(parsed.league).toBe("La Liga");
    expect(parsed.season).toBe(2023);
    expect(parsed.sort.key).toBe("xA90");
  });
  it("defaults to the latest season and 900 minutes", () => {
    const parsed = parseQuery("top scoring forwards", seasons);
    expect(parsed.season).toBe(2024);
    expect(parsed.minutes).toBe(900);
    expect(parsed.sort.key).toBe("goals");
  });
  it("flags things the data cannot answer", () => {
    expect(parseQuery("young cheap strikers", seasons).ignored.length).toBeGreaterThan(0);
  });
  it("filters and sorts", () => {
    const rows = [
      { position: "Forward", league: "Serie A", season: 2024, minutes: 1500, goals: 10, pct: {} },
      { position: "Forward", league: "Serie A", season: 2024, minutes: 1500, goals: 20, pct: {} },
      { position: "Midfielder", league: "Serie A", season: 2024, minutes: 1500, goals: 30, pct: {} },
    ];
    const result = runQuery(rows, parseQuery("top scoring forwards in serie a", seasons));
    expect(result.map((r) => r.player.goals)).toEqual([20, 10]);
  });
});
