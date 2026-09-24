import { describe, it, expect } from "vitest";
import {
  SLOT_SYMBOLS,
  TOTAL_WEIGHT,
  SCATTER_ID,
  SLOT_XP_CAP,
  SLOT_DAILY_SPINS,
  symbolFromRoll,
  buildGrid,
  scoreGrid,
  finalXp,
  spinsRemaining,
  lineHitChance,
  spinLineHitChance,
  jackpotChance,
  tierChance,
  chanceWithin,
  JACKPOT_TIERS,
  SLOT_JACKPOT_XP,
  SLOT_JACKPOT_CAP,
} from "./slots.logic";

const fill = (id: number) => Array.from({ length: 6 }, () => [id, id, id]);
// Grid with no line wins; first `n` cells of row 0 are scatters.
const scatterGrid = (n: number) =>
  Array.from({ length: 6 }, (_, i) => [i < n ? SCATTER_ID : (i % 2) + 5, i % 2, (i % 2) + 2]);

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("slots logic", () => {
  it("has 14 symbols with positive weights", () => {
    expect(SLOT_SYMBOLS).toHaveLength(14);
    expect(SLOT_SYMBOLS.every((s) => s.weight > 0)).toBe(true);
  });
  it("maps roll boundaries to symbols and rejects out-of-range", () => {
    expect(symbolFromRoll(0)).toBe(0);
    expect(symbolFromRoll(TOTAL_WEIGHT - 1)).toBe(SCATTER_ID);
    expect(() => symbolFromRoll(TOTAL_WEIGHT)).toThrow();
    expect(() => symbolFromRoll(-1)).toThrow();
  });
  it("builds a 6x3 grid", () => {
    const g = buildGrid(Array(18).fill(0));
    expect(g).toHaveLength(6);
    expect(g.every((r) => r.length === 3)).toBe(true);
  });
  it("no-match grid pays 0", () => {
    const g = [
      [0, 1, 2],
      [1, 2, 0],
      [2, 0, 1],
      [0, 1, 2],
      [1, 2, 0],
      [2, 0, 1],
    ];
    const r = scoreGrid(g);
    expect(r.wins).toHaveLength(0);
    expect(r.baseXp).toBe(0);
    expect(r.tier).toBeNull();
  });
  it("pays runs anywhere on the line, 3 at base and 4 at double", () => {
    const g = [
      [1, 1, 3],
      [8, 2, 0],
      [8, 0, 0],
      [8, 1, 0],
      [2, 2, 0],
      [0, 3, 2],
    ];
    const r = scoreGrid(g);
    expect(r.wins).toEqual([
      { row: 0, symbol: 8, length: 3, xp: 60, start: 1 },
      { row: 2, symbol: 0, length: 4, xp: 18, start: 1 },
    ]);
    expect(r.baseXp).toBe(78);
  });
  it("caps line XP", () => {
    const r = scoreGrid(fill(12));
    expect(r.baseXp).toBe(SLOT_XP_CAP);
    expect(finalXp(r.baseXp, true)).toBe(SLOT_XP_CAP);
  });
  it("scatters never pay on a line", () => {
    const r = scoreGrid(fill(SCATTER_ID));
    expect(r.wins).toHaveLength(0);
    expect(r.bonusAwarded).toBe(3);
    expect(scoreGrid(scatterGrid(2)).bonusAwarded).toBe(0);
  });
  it("jackpot tiers: 3 = Mini, 4 = Major, 5+ = Grand, fixed XP", () => {
    expect(scoreGrid(scatterGrid(2)).tier).toBeNull();
    const mini = scoreGrid(scatterGrid(3));
    expect(mini.tier?.id).toBe("mini");
    expect(mini.baseXp).toBe(100);
    expect(mini.bonusAwarded).toBe(3);
    const major = scoreGrid(scatterGrid(4));
    expect(major.tier?.id).toBe("major");
    expect(major.baseXp).toBe(300);
    expect(major.jackpot).toBe(false);
    const grand = scoreGrid(scatterGrid(5));
    expect(grand.tier?.id).toBe("grand");
    expect(grand.jackpot).toBe(true);
    expect(grand.baseXp).toBe(SLOT_JACKPOT_XP);
  });
  it("bonus doubles XP, capped", () => {
    expect(finalXp(20, true)).toBe(40);
    expect(finalXp(20, false)).toBe(20);
    expect(finalXp(-5, true)).toBe(0);
    expect(finalXp(SLOT_JACKPOT_XP + 250, true, true)).toBe(SLOT_JACKPOT_CAP);
    expect(finalXp(SLOT_JACKPOT_XP, true, false)).toBe(SLOT_XP_CAP);
  });
  it("daily allowance never goes negative", () => {
    expect(spinsRemaining(0)).toBe(SLOT_DAILY_SPINS);
    expect(spinsRemaining(99)).toBe(0);
  });
  it("published odds are ordered and attainable", () => {
    const [mini, major, grand] = JACKPOT_TIERS.map(tierChance);
    expect(mini).toBeGreaterThan(major);
    expect(major).toBeGreaterThan(grand);
    expect(grand).toBe(jackpotChance());
    // A typical player (10 spins/day) should have a real shot at a Mini within 3 days
    expect(chanceWithin(mini + major + grand, SLOT_DAILY_SPINS * 3)).toBeGreaterThan(0.4);
    expect(grand).toBeLessThan(0.001);
    expect(spinLineHitChance()).toBeGreaterThan(0.15);
    expect(lineHitChance()).toBeLessThan(0.2);
  });
  it("displayed odds match a seeded simulation", () => {
    const rnd = mulberry(42);
    const N = 60000;
    let line = 0;
    let mini = 0;
    let xp = 0;
    for (let i = 0; i < N; i++) {
      const g = buildGrid(Array.from({ length: 18 }, () => Math.floor(rnd() * TOTAL_WEIGHT)));
      const r = scoreGrid(g);
      if (r.wins.length) line++;
      if (r.tier?.id === "mini") mini++;
      xp += finalXp(r.baseXp, false, !!r.tier);
    }
    expect(Math.abs(line / N - spinLineHitChance())).toBeLessThan(0.01);
    expect(Math.abs(mini / N - tierChance(JACKPOT_TIERS[0]))).toBeLessThan(0.003);
    // Meaningful progress: several XP per spin on average, i.e. dozens per day
    expect(xp / N).toBeGreaterThan(4);
    expect(xp / N).toBeLessThan(15);
  });
});
