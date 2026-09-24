// Resident Slots — pure, client-safe rules. The paytable and odds are public
// on purpose (shown in How to Play). The server draws the grid with crypto RNG
// and an atomic database routine enforces the allowance and grants XP once.
// XP is free in-app points with no monetary value.

export const SLOT_REELS = 6;
export const SLOT_ROWS = 3;
export const SLOT_DAILY_SPINS = 10;
export const SLOT_XP_CAP = 250; // max XP a single spin can award (after bonus multiplier)
export const SLOT_BONUS_MULTIPLIER = 2;
export const SLOT_BONUS_SPINS_AWARDED = 3;
export const SLOT_BONUS_BANK_CAP = 9;
export const SLOT_SCATTER_TRIGGER = 3;
// Resident Jackpot: fixed, XP-only, transparent. 5+ Neon Cores anywhere.
export const SLOT_JACKPOT_XP = 1000;
export const SLOT_JACKPOT_SCATTERS = 5;
export const SLOT_JACKPOT_CAP = 2500; // absolute ceiling incl. bonus multiplier

export type SlotSymbol = { id: number; name: string; glyph: string; weight: number; base: number };

// 14 original symbols. `base` = XP for 3 in a row; longer runs multiply.
export const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: 0, name: "Pixel", glyph: "👾", weight: 14, base: 2 },
  { id: 1, name: "Joystick", glyph: "🕹️", weight: 13, base: 2 },
  { id: 2, name: "Cherry Byte", glyph: "🍒", weight: 12, base: 3 },
  { id: 3, name: "Token Coin", glyph: "🪙", weight: 11, base: 3 },
  { id: 4, name: "Block", glyph: "🧊", weight: 10, base: 4 },
  { id: 5, name: "Satellite", glyph: "🛰️", weight: 9, base: 5 },
  { id: 6, name: "Planet", glyph: "🪐", weight: 8, base: 6 },
  { id: 7, name: "Comet", glyph: "☄️", weight: 7, base: 8 },
  { id: 8, name: "Rocket", glyph: "🚀", weight: 6, base: 10 },
  { id: 9, name: "Alien", glyph: "👽", weight: 5, base: 12 },
  { id: 10, name: "Robot", glyph: "🤖", weight: 4, base: 15 },
  { id: 11, name: "Diamond Key", glyph: "💎", weight: 3, base: 20 },
  { id: 12, name: "Crown", glyph: "👑", weight: 2, base: 30 },
  { id: 13, name: "Neon Core", glyph: "🌀", weight: 3, base: 0 }, // scatter: triggers bonus
];
export const SCATTER_ID = 13;
export const RUN_MULTIPLIER: Record<number, number> = { 3: 1, 4: 2, 5: 4, 6: 8 };
export const TOTAL_WEIGHT = SLOT_SYMBOLS.reduce((s, x) => s + x.weight, 0);

/** grid[reel][row] of symbol ids */
export type SlotGrid = number[][];
export type LineWin = { row: number; symbol: number; length: number; xp: number };

/** Map a uniform integer in [0, TOTAL_WEIGHT) to a symbol id. */
export function symbolFromRoll(roll: number): number {
  if (!Number.isInteger(roll) || roll < 0 || roll >= TOTAL_WEIGHT) throw new Error("bad roll");
  let r = roll;
  for (const s of SLOT_SYMBOLS) {
    if (r < s.weight) return s.id;
    r -= s.weight;
  }
  return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1].id;
}

export function buildGrid(rolls: number[]): SlotGrid {
  if (rolls.length !== SLOT_REELS * SLOT_ROWS) throw new Error("bad roll count");
  const grid: SlotGrid = [];
  for (let reel = 0; reel < SLOT_REELS; reel++) {
    grid.push(rolls.slice(reel * SLOT_ROWS, reel * SLOT_ROWS + SLOT_ROWS).map(symbolFromRoll));
  }
  return grid;
}

/** Score 3 horizontal paylines, left-to-right runs of 3+. Scatter never pays on a line. */
export function scoreGrid(grid: SlotGrid): {
  wins: LineWin[];
  baseXp: number;
  scatters: number;
  bonusAwarded: number;
  jackpot: boolean;
} {
  const wins: LineWin[] = [];
  for (let row = 0; row < SLOT_ROWS; row++) {
    const first = grid[0][row];
    if (first === SCATTER_ID) continue;
    let length = 1;
    while (length < SLOT_REELS && grid[length][row] === first) length++;
    if (length >= 3) {
      const xp = SLOT_SYMBOLS[first].base * RUN_MULTIPLIER[length];
      wins.push({ row, symbol: first, length, xp });
    }
  }
  const scatters = grid.flat().filter((s) => s === SCATTER_ID).length;
  const bonusAwarded = scatters >= SLOT_SCATTER_TRIGGER ? SLOT_BONUS_SPINS_AWARDED : 0;
  const baseXp = Math.min(
    wins.reduce((s, w) => s + w.xp, 0),
    SLOT_XP_CAP,
  );
  const jackpot = scatters >= SLOT_JACKPOT_SCATTERS;
  return {
    wins,
    baseXp: baseXp + (jackpot ? SLOT_JACKPOT_XP : 0),
    scatters,
    bonusAwarded,
    jackpot,
  };
}

/** Final XP after optional bonus multiplier, always capped. Mirrors the DB routine. */
export function finalXp(baseXp: number, isBonus: boolean, jackpot = false): number {
  return Math.min(
    Math.max(baseXp, 0) * (isBonus ? SLOT_BONUS_MULTIPLIER : 1),
    jackpot ? SLOT_JACKPOT_CAP : SLOT_XP_CAP,
  );
}

export function spinsRemaining(usedToday: number): number {
  return Math.max(0, SLOT_DAILY_SPINS - usedToday);
}

export function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Probability a single payline shows 3+ of a kind (for the How to Play odds). */
export function lineHitChance(): number {
  return SLOT_SYMBOLS.filter((s) => s.id !== SCATTER_ID).reduce((sum, s) => {
    const p = s.weight / TOTAL_WEIGHT;
    return sum + p * p * p;
  }, 0);
}

export function symbolChance(id: number): number {
  return SLOT_SYMBOLS[id].weight / TOTAL_WEIGHT;
}

function choose(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

/** Exact chance a spin hits the jackpot (5+ scatters among 18 cells). */
export function jackpotChance(): number {
  const n = SLOT_REELS * SLOT_ROWS;
  const p = symbolChance(SCATTER_ID);
  let sum = 0;
  for (let k = SLOT_JACKPOT_SCATTERS; k <= n; k++)
    sum += choose(n, k) * p ** k * (1 - p) ** (n - k);
  return sum;
}
