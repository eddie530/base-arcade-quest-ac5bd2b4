// Server-only: reward weights MUST NOT ship to the client.
// The `.server.ts` suffix excludes this from the browser bundle.

export type SpinReward = {
  label: string;
  xp: number;
  weight: number;
  kind: "xp" | "double" | "bonus" | "jackpot";
};

export const SPIN_REWARDS: SpinReward[] = [
  { label: "10 XP", xp: 10, weight: 30, kind: "xp" },
  { label: "25 XP", xp: 25, weight: 22, kind: "xp" },
  { label: "50 XP", xp: 50, weight: 14, kind: "xp" },
  { label: "100 XP", xp: 100, weight: 8, kind: "xp" },
  { label: "Double XP", xp: 75, weight: 12, kind: "double" },
  { label: "Bonus Spin", xp: 20, weight: 10, kind: "bonus" },
  { label: "JACKPOT", xp: 1000, weight: 4, kind: "jackpot" },
];

export function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const it of items) {
    if ((r -= it.weight) <= 0) return it;
  }
  return items[items.length - 1];
}
