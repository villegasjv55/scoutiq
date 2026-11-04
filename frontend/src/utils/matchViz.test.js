import { describe, expect, it } from "vitest";
import { heatGrid, passNetwork, shotSummary } from "./matchViz";

describe("heatGrid", () => {
  it("peaks at 1 near the points and stays within 0..1", () => {
    const g = heatGrid([[60, 40], [61, 41], [10, 10]], 24, 16);
    expect(Math.max(...g)).toBe(1);
    expect(Math.min(...g)).toBeGreaterThanOrEqual(0);
    expect(g).toHaveLength(24 * 16);
  });
  it("is all zeros with no points", () => {
    expect(heatGrid([]).every((v) => v === 0)).toBe(true);
  });
});

describe("passNetwork", () => {
  const pass = (from, to, ok = 0) => [0, from, to, 10, 50, 40, 60, 40, ok, 0, 0];
  const match = { passes: [...Array(5).fill().map(() => pass(1, 2)), ...Array(5).fill().map(() => pass(2, 1)), ...Array(5).fill().map(() => pass(1, 3, 1))] };
  it("links players by completed passes in either direction", () => {
    const net = passNetwork(match, 0, 3, 3);
    expect(net.links).toEqual([{ a: 1, b: 2, count: 10 }]);
    expect(net.nodes.map((n) => n.id).sort()).toEqual([1, 2]);
  });
});

describe("shotSummary", () => {
  it("counts goals, shots on target and xG", () => {
    const s = shotSummary([{ o: "Goal", xg: 0.5 }, { o: "Saved", xg: 0.25 }, { o: "Off T", xg: 0.25 }]);
    expect(s).toMatchObject({ shots: 3, goals: 1, onTarget: 2 });
    expect(s.xg).toBeCloseTo(1);
  });
});
