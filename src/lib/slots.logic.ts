// Resident Slots — pure, client-safe rules. The paytable and odds are public
// on purpose (shown in How to Play). The server draws the grid with crypto RNG
// and an atomic database routine enforces the allowance and grants XP once.
// XP is free in-app points with no monetary value.

export const SLOT_REELS = 6;
export const SLOT_ROWS = 3;
export const SLOT_DAILY_SPINS = 10;
export const SLOT_XP_CAP = 250; // max line XP per spin (after bonus multiplier), non-jackpot spins
export const SLOT_BONUS_MULTIPLIER = 2;
export const SLOT_BONUS_SPINS_AWARDED = 3;
export const SLOT_BONUS_BANK_CAP = 9;
export const SLOT_SCATTER_TRIGGER = 3;
export const SLOT_JACKPOT_CAP = 2500; // absolute per-spin ceiling on any jackpot spin

export type JackpotTier = {
  id: "mini" | "major" | "grand";
  name: string;
  scatters: number;
  xp: number;
};
// Tier is decided by the number of Neon Cores anywhere on the grid (exact count; grand = 5+).
export const JACKPOT_TIERS: JackpotTier[] = [
  { id: "mini", name: "Mini Jackpot", scatters: 3, xp: 100 },
  { id: "major", name: "Major Jackpot", scatters: 4, xp: 300 },
  { id: "grand", name: "Grand Jackpot", scatters: 5, xp: 1000 },
];
export const SLOT_JACKPOT_XP = 1000; // Grand
export const SLOT_JACKPOT_SCATTERS = 5; // Grand

export type SlotSymbol = { id: number; name: string; glyph: string; weight: number; base: number };

// 14 original symbols. `base` = XP for 3 in a row; longer runs multiply.
export const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: 0, name: "Pixel", glyph: "👾", weight: 60, base: 9 },
  { id: 1, name: "Joystick", glyph: "🕹️", weight: 48, base: 12 },
  { id: 2, name: "Cherry Byte", glyph: "🍒", weight: 38, base: 15 },
  { id: 3, name: "Token Coin", glyph: "🪙", weight: 28, base: 18 },
  { id: 4, name: "Block", glyph: "🧊", weight: 20, base: 24 },
  { id: 5, name: "Satellite", glyph: "🛰️", weight: 15, base: 30 },
  { id: 6, name: "Planet", glyph: "🪐", weight: 11, base: 36 },
  { id: 7, name: "Comet", glyph: "☄️", weight: 8, base: 45 },
  { id: 8, name: "Rocket", glyph: "🚀", weight: 6, base: 60 },
  { id: 9, name: "Alien", glyph: "👽", weight: 5, base: 75 },
  { id: 10, name: "Robot", glyph: "🤖", weight: 4, base: 90 },
  { id: 11, name: "Diamond Key", glyph: "💎", weight: 3, base: 120 },
  { id: 12, name: "Crown", glyph: "👑", weight: 2, base: 180 },
  { id: 13, name: "Neon Core", glyph: "🌀", weight: 9, base: 0 }, // scatter: jackpots + bonus
];
export const SCATTER_ID = 13;
export const RUN_MULTIPLIER: Record<number, number> = { 3: 1, 4: 2, 5: 4, 6: 8 };
export const TOTAL_WEIGHT = SLOT_SYMBOLS.reduce((s, x) => s + x.weight, 0);

/** grid[reel][row] of symbol ids */
export type SlotGrid = number[][];
/** `start` = first reel of the winning run */
export type LineWin = { row: number; symbol: number; length: number; xp: number; start: number };

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

/** Best (highest-XP) run of 3+ adjacent identical symbols on one payline. */
function bestRun(row: number, cells: number[]): LineWin | null {
  let best: LineWin | null = null;
  let i = 0;
  while (i < cells.length) {
    let j = i;
    while (j + 1 < cells.length && cells[j + 1] === cells[i]) j++;
    const length = j - i + 1;
    if (length >= 3 && cells[i] !== SCATTER_ID) {
      const xp = SLOT_SYMBOLS[cells[i]].base * RUN_MULTIPLIER[length];
      if (!best || xp > best.xp) best = { row, symbol: cells[i], length, xp, start: i };
    }
    i = j + 1;
  }
  return best;
}

export function jackpotTierFor(scatters: number): JackpotTier | null {
  if (scatters >= 5) return JACKPOT_TIERS[2];
  if (scatters === 4) return JACKPOT_TIERS[1];
  if (scatters === 3) return JACKPOT_TIERS[0];
  return null;
}

/** 3 horizontal paylines; each pays its best run of 3+ adjacent matches anywhere on the line. */
export function scoreGrid(grid: SlotGrid): {
  wins: LineWin[];
  lineXp: number;
  baseXp: number;
  scatters: number;
  bonusAwarded: number;
  jackpot: boolean;
  tier: JackpotTier | null;
} {
  const wins: LineWin[] = [];
  for (let row = 0; row < SLOT_ROWS; row++) {
    const w = bestRun(
      row,
      grid.map((col) => col[row]),
    );
    if (w) wins.push(w);
  }
  const scatters = grid.flat().filter((s) => s === SCATTER_ID).length;
  const tier = jackpotTierFor(scatters);
  const bonusAwarded = scatters >= SLOT_SCATTER_TRIGGER ? SLOT_BONUS_SPINS_AWARDED : 0;
  const lineXp = Math.min(
    wins.reduce((s, w) => s + w.xp, 0),
    SLOT_XP_CAP,
  );
  return {
    wins,
    lineXp,
    baseXp: lineXp + (tier?.xp ?? 0),
    scatters,
    bonusAwarded,
    jackpot: tier?.id === "grand",
    tier,
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

export function symbolChance(id: number): number {
  return SLOT_SYMBOLS[id].weight / TOTAL_WEIGHT;
}

/** Exact chance one payline contains a paying run (3+ adjacent identical non-scatter). DP over cells. */
export function lineHitChance(): number {
  const n = SLOT_SYMBOLS.length;
  // state[sym][run] = prob of not-yet-paid sequences ending in sym with current run length (1..2)
  let state: number[][] = Array.from({ length: n }, (_, s) => [0, symbolChance(s), 0]);
  let paid = 0;
  for (let cell = 1; cell < SLOT_REELS; cell++) {
    const next: number[][] = Array.from({ length: n }, () => [0, 0, 0]);
    for (let s = 0; s < n; s++) {
      for (let run = 1; run <= 2; run++) {
        const p = state[s][run];
        if (!p) continue;
        for (let t = 0; t < n; t++) {
          const q = p * symbolChance(t);
          if (t !== s) next[t][1] += q;
          else if (run === 2 && s !== SCATTER_ID) paid += q;
          else next[t][Math.min(run + 1, 2)] += q;
        }
      }
    }
    state = next;
  }
  return paid;
}

/** Chance a spin pays any line XP (paylines are independent). */
export function spinLineHitChance(): number {
  return 1 - (1 - lineHitChance()) ** SLOT_ROWS;
}

function choose(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

/** Exact chance of exactly k (or k+ when orMore) scatters among 18 cells. */
export function scatterChance(k: number, orMore = false): number {
  const n = SLOT_REELS * SLOT_ROWS;
  const p = symbolChance(SCATTER_ID);
  const pk = (j: number) => choose(n, j) * p ** j * (1 - p) ** (n - j);
  if (!orMore) return pk(k);
  let sum = 0;
  for (let j = k; j <= n; j++) sum += pk(j);
  return sum;
}

export function tierChance(tier: JackpotTier): number {
  return scatterChance(tier.scatters, tier.id === "grand");
}

/** Grand Jackpot chance per spin. */
export function jackpotChance(): number {
  return scatterChance(SLOT_JACKPOT_SCATTERS, true);
}

/** Chance of seeing a given tier (or better) at least once over `spins` spins. */
export function chanceWithin(p: number, spins: number): number {
  return 1 - (1 - p) ** spins;
}
