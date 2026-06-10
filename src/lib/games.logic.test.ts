import { describe, it, expect } from "vitest";
import {
  DAILY_BONUS_COOLDOWN_HOURS,
  FLIP_COOLDOWN_MS,
  FLIP_LOSS_XP,
  FLIP_WIN_XP,
  REFERRAL_REWARD_XP,
  SPIN_COOLDOWN_MS,
  checkCooldown,
  computeDailyClaim,
  flipXp,
} from "./games.logic";

const HOUR = 3_600_000;

describe("daily bonus", () => {
  const now = new Date("2026-06-10T12:00:00Z");

  it("awards a bonus on first claim and starts streak at 1", () => {
    const r = computeDailyClaim({ now, lastClaimAt: null, currentXp: 0, currentStreak: 0 });
    expect(r).toEqual({ ok: true, reward: 30, streak: 1, xp: 30 });
  });

  it("rejects a second claim inside the 24h window and does NOT mutate xp/streak", () => {
    const last = new Date(now.getTime() - 5 * HOUR);
    const r = computeDailyClaim({ now, lastClaimAt: last, currentXp: 500, currentStreak: 4 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.hoursLeft).toBeGreaterThan(0);
    // No xp/streak fields means callers cannot accidentally award XP.
    expect((r as Record<string, unknown>).xp).toBeUndefined();
    expect((r as Record<string, unknown>).streak).toBeUndefined();
  });

  it("continues the streak when claimed within 48h of the previous claim", () => {
    const last = new Date(now.getTime() - 25 * HOUR);
    const r = computeDailyClaim({ now, lastClaimAt: last, currentXp: 100, currentStreak: 3 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.streak).toBe(4);
      expect(r.reward).toBe(25 + Math.min(4 * 5, 100));
      expect(r.xp).toBe(100 + r.reward);
    }
  });

  it("resets the streak after 48h", () => {
    const last = new Date(now.getTime() - 49 * HOUR);
    const r = computeDailyClaim({ now, lastClaimAt: last, currentXp: 100, currentStreak: 9 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.streak).toBe(1);
  });

  it("caps the streak bonus at +100", () => {
    const last = new Date(now.getTime() - 25 * HOUR);
    const r = computeDailyClaim({ now, lastClaimAt: last, currentXp: 0, currentStreak: 50 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.reward).toBe(125);
  });

  it("constant: 24h cooldown is non-negotiable", () => {
    expect(DAILY_BONUS_COOLDOWN_HOURS).toBe(24);
  });
});

describe("spin cooldown", () => {
  const now = new Date("2026-06-10T12:00:00Z");

  it("is exactly 24h", () => {
    expect(SPIN_COOLDOWN_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("allows the first spin", () => {
    expect(checkCooldown(now, null, SPIN_COOLDOWN_MS)).toEqual({ ok: true });
  });

  it("blocks a spin inside the window", () => {
    const last = new Date(now.getTime() - 1 * HOUR);
    const r = checkCooldown(now, last, SPIN_COOLDOWN_MS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.remainingMs).toBeGreaterThan(0);
  });

  it("allows a spin once 24h has passed", () => {
    const last = new Date(now.getTime() - 24 * HOUR - 1);
    expect(checkCooldown(now, last, SPIN_COOLDOWN_MS)).toEqual({ ok: true });
  });
});

describe("flip cooldown + XP", () => {
  const now = new Date("2026-06-10T12:00:00Z");

  it("is exactly 5s", () => {
    expect(FLIP_COOLDOWN_MS).toBe(5_000);
  });

  it("blocks a flip inside the window", () => {
    const last = new Date(now.getTime() - 2_000);
    const r = checkCooldown(now, last, FLIP_COOLDOWN_MS);
    expect(r.ok).toBe(false);
  });

  it("allows a flip once 5s has passed", () => {
    const last = new Date(now.getTime() - 5_001);
    expect(checkCooldown(now, last, FLIP_COOLDOWN_MS)).toEqual({ ok: true });
  });

  it("awards win XP only on a win", () => {
    expect(flipXp(true)).toBe(FLIP_WIN_XP);
    expect(flipXp(false)).toBe(FLIP_LOSS_XP);
    expect(FLIP_WIN_XP).toBeGreaterThan(FLIP_LOSS_XP);
  });
});

describe("referral reward", () => {
  it("is 200 XP per side", () => {
    expect(REFERRAL_REWARD_XP).toBe(200);
  });
});