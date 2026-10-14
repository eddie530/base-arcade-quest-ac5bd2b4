// PredictX rules — free XP only, mirrored by the resolve_predict_market DB routine.
export const PREDICT_BASE_XP = 50;
export const PREDICT_STREAK_STEP = 10;
export const PREDICT_STREAK_MAX_STEPS = 5;

/** XP for a correct call given the player's streak before this call. Wrong calls pay 0. */
export function predictXp(correct: boolean, streakBefore: number): number {
  if (!correct) return 0;
  return PREDICT_BASE_XP + PREDICT_STREAK_STEP * Math.min(Math.max(streakBefore, 0), PREDICT_STREAK_MAX_STEPS);
}

export function isMarketOpen(m: { closes_at: string; resolution: string | null }, now = new Date()) {
  return !m.resolution && new Date(m.closes_at).getTime() > now.getTime();
}

export const PREDICT_BADGES: Record<string, string> = {
  oracle_5: "Oracle (5 correct)",
  oracle_25: "Seer (25 correct)",
  hot_streak_5: "Hot Streak (5 in a row)",
};
