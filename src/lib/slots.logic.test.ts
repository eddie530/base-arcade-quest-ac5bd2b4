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
  jackpotChance,
  SLOT_JACKPOT_XP,
  SLOT_JACKPOT_CAP,
} from "./slots.logic";

const fill = (id: number) => Array.from({ length: 6 }, () => [id, id, id]);

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
  });
  it("pays 3-of-a-kind at base and 4 at double", () => {
    const g = [
      [8, 1, 0],
      [8, 2, 0],
      [8, 0, 0],
      [1, 1, 0],
      [2, 2, 1],
      [0, 3, 2],
    ];
    const r = scoreGrid(g);
    expect(r.wins).toEqual([
      { row: 0, symbol: 8, length: 3, xp: 10 },
      { row: 2, symbol: 0, length: 4, xp: 4 },
    ]);
    expect(r.baseXp).toBe(14);
  });
  it("caps total XP", () => {
    const r = scoreGrid(fill(12));
    expect(r.baseXp).toBe(SLOT_XP_CAP);
    expect(finalXp(r.baseXp, true)).toBe(SLOT_XP_CAP);
  });
  it("scatters trigger bonus spins but never pay on a line", () => {
    const r = scoreGrid(fill(SCATTER_ID));
    expect(r.wins).toHaveLength(0);
    expect(r.bonusAwarded).toBe(3);
    const two = scoreGrid([
      [SCATTER_ID, 0, 1],
      [SCATTER_ID, 1, 0],
      [2, 3, 4],
      [3, 4, 2],
      [4, 2, 3],
      [5, 6, 7],
    ]);
    expect(two.bonusAwarded).toBe(0);
  });
  it("bonus doubles XP, capped", () => {
    expect(finalXp(20, true)).toBe(40);
    expect(finalXp(20, false)).toBe(20);
    expect(finalXp(-5, true)).toBe(0);
  });
  it("daily allowance never goes negative", () => {
    expect(spinsRemaining(0)).toBe(SLOT_DAILY_SPINS);
    expect(spinsRemaining(99)).toBe(0);
  });
  it("line hit chance is a sane probability", () => {
    const p = lineHitChance();
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(0.1);
  });
  it("jackpot: 5+ scatters add fixed XP, below 5 does not", () => {
    const g = fill(0).map((c, i) => (i < 5 ? [SCATTER_ID, i, i + 5] : [12, 11, 10]));
    const r = scoreGrid(g);
    expect(r.jackpot).toBe(true);
    expect(r.baseXp).toBe(SLOT_JACKPOT_XP);
    const g4 = fill(0).map((c, i) => (i < 4 ? [SCATTER_ID, i, i + 5] : [12, 11, 10]));
    expect(scoreGrid(g4).jackpot).toBe(false);
  });
  it("jackpot is capped even with bonus multiplier", () => {
    expect(finalXp(SLOT_JACKPOT_XP + 250, true, true)).toBe(SLOT_JACKPOT_CAP);
    expect(finalXp(SLOT_JACKPOT_XP, true, false)).toBe(SLOT_XP_CAP);
  });
  it("jackpot chance is rare but non-zero", () => {
    const p = jackpotChance();
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(0.001);
  });
});
