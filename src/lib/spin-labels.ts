// Client-safe: labels and XP only. NO weights. Used for the wheel UI.
// Order MUST match SPIN_REWARDS in src/lib/games.server.ts so rewardIndex
// returned by the server lines up with the slice rendered on the wheel.

export type SpinSlice = {
  label: string;
  xp: number;
  kind: "xp" | "double" | "bonus" | "jackpot";
};

export const SPIN_SLICES: SpinSlice[] = [
  { label: "10 XP", xp: 10, kind: "xp" },
  { label: "25 XP", xp: 25, kind: "xp" },
  { label: "50 XP", xp: 50, kind: "xp" },
  { label: "100 XP", xp: 100, kind: "xp" },
  { label: "Double XP", xp: 75, kind: "double" },
  { label: "Bonus Spin", xp: 20, kind: "bonus" },
  { label: "JACKPOT", xp: 1000, kind: "jackpot" },
];
