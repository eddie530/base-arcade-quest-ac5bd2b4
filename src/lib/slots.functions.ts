import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  SLOT_BONUS_BANK_CAP,
  SLOT_BONUS_MULTIPLIER,
  SLOT_DAILY_SPINS,
  SLOT_REELS,
  SLOT_ROWS,
  SLOT_XP_CAP,
  SLOT_JACKPOT_CAP,
  TOTAL_WEIGHT,
  buildGrid,
  scoreGrid,
  spinsRemaining,
  utcDay,
} from "@/lib/slots.logic";

/** Unbiased crypto-strong integer in [0, max) via rejection sampling. */
function secureInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

export const getSlotsState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = utcDay(new Date());
    const [{ data: profile }, { count }, { data: recent }] = await Promise.all([
      supabase.from("profiles").select("xp, slot_bonus_spins").eq("user_id", userId).maybeSingle(),
      supabase
        .from("slot_spins")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("spin_day", today)
        .eq("is_bonus", false),
      supabase
        .from("slot_spins")
        .select("id, xp, is_bonus, bonus_awarded, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);
    return {
      xp: (profile?.xp as number) ?? 0,
      bonusSpins: (profile?.slot_bonus_spins as number) ?? 0,
      remaining: spinsRemaining(count ?? 0),
      recent: recent ?? [],
    };
  });

export const spinSlots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const rolls = Array.from({ length: SLOT_REELS * SLOT_ROWS }, () => secureInt(TOTAL_WEIGHT));
    const grid = buildGrid(rolls);
    const { wins, baseXp, bonusAwarded, scatters, jackpot, tier } = scoreGrid(grid);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("record_slot_spin", {
      _user_id: userId,
      _grid: grid,
      _wins: wins,
      _base_xp: baseXp,
      _bonus_awarded: bonusAwarded,
      _daily_limit: SLOT_DAILY_SPINS,
      _bonus_multiplier: SLOT_BONUS_MULTIPLIER,
      _xp_cap: tier ? SLOT_JACKPOT_CAP : SLOT_XP_CAP,
      _bonus_bank_cap: SLOT_BONUS_BANK_CAP,
    });
    if (error) {
      console.error("record_slot_spin failed", error);
      throw new Error("Spin could not be recorded. Please try again.");
    }
    const r = data as any;
    if (!r?.ok) {
      return {
        ok: false as const,
        reason: r?.reason === "daily_limit" ? "daily_limit" : "error",
        message:
          r?.reason === "daily_limit"
            ? "You've used all 10 spins today. New spins at 00:00 UTC."
            : "Profile not found.",
      };
    }
    // XP awarded may be doubled on bonus spins; scale win rows for display.
    const mult = r.is_bonus ? SLOT_BONUS_MULTIPLIER : 1;
    return {
      ok: true as const,
      grid,
      wins: wins.map((w) => ({ ...w, xp: w.xp * mult })),
      scatters,
      jackpot,
      tier: tier ? { id: tier.id, name: tier.name, xp: tier.xp } : null,
      xp: r.xp as number,
      isBonus: !!r.is_bonus,
      bonusAwarded,
      bonusSpins: r.bonus_spins as number,
      totalXp: r.total_xp as number,
      remaining: spinsRemaining(r.used as number),
    };
  });
