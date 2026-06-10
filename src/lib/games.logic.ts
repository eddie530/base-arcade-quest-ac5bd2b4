// Pure, side-effect-free game rules. Imported by server functions AND tests.
// Editing these values will break the smoke-test CI — that is intentional.

export const DAILY_BONUS_COOLDOWN_HOURS = 24;
export const DAILY_BONUS_STREAK_RESET_HOURS = 48;
export const SPIN_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const FLIP_COOLDOWN_MS = 5_000;
export const FLIP_WIN_XP = 30;
export const FLIP_LOSS_XP = 5;
export const REFERRAL_REWARD_XP = 200;

export type DailyClaim =
  | { ok: true; reward: number; streak: number; xp: number }
  | { ok: false; hoursLeft: number };

export function computeDailyClaim(opts: {
  now: Date;
  lastClaimAt: Date | null;
  currentXp: number;
  currentStreak: number;
}): DailyClaim {
  const { now, lastClaimAt, currentXp, currentStreak } = opts;
  if (lastClaimAt) {
    const hours = (now.getTime() - lastClaimAt.getTime()) / 36e5;
    if (hours < DAILY_BONUS_COOLDOWN_HOURS) {
      return { ok: false, hoursLeft: Math.ceil(DAILY_BONUS_COOLDOWN_HOURS - hours) };
    }
  }
  const continued =
    lastClaimAt !== null &&
    (now.getTime() - lastClaimAt.getTime()) / 36e5 < DAILY_BONUS_STREAK_RESET_HOURS;
  const streak = continued ? currentStreak + 1 : 1;
  const reward = 25 + Math.min(streak * 5, 100);
  return { ok: true, reward, streak, xp: currentXp + reward };
}

export type CooldownCheck =
  | { ok: true }
  | { ok: false; remainingMs: number };

export function checkCooldown(
  now: Date,
  lastAt: Date | null,
  cooldownMs: number,
): CooldownCheck {
  if (!lastAt) return { ok: true };
  const elapsed = now.getTime() - lastAt.getTime();
  if (elapsed < cooldownMs) return { ok: false, remainingMs: cooldownMs - elapsed };
  return { ok: true };
}

export function flipXp(won: boolean): number {
  return won ? FLIP_WIN_XP : FLIP_LOSS_XP;
}