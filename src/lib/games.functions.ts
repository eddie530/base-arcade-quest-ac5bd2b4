import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Reward weights live in src/lib/games.server.ts so the table never ships
// to the browser. The client wheel reads label-only data from spin-labels.ts.

const BADGES = {
  first_spin: "First Spin",
  streak_7: "7 Day Streak",
  streak_30: "30 Day Streak",
  xp_master: "XP Master",
  arcade_legend: "Arcade Legend",
} as const;

async function awardBadges(
  supabase: any,
  userId: string,
  ctx: { xp: number; streak: number; firstSpin?: boolean }
) {
  const earned: string[] = [];
  if (ctx.firstSpin) earned.push("first_spin");
  if (ctx.streak >= 7) earned.push("streak_7");
  if (ctx.streak >= 30) earned.push("streak_30");
  if (ctx.xp >= 1000) earned.push("xp_master");
  if (ctx.xp >= 10000) earned.push("arcade_legend");
  if (earned.length === 0) return [];
  await supabase
    .from("user_achievements")
    .upsert(earned.map((b) => ({ user_id: userId, badge: b })), { onConflict: "user_id,badge" });
  return earned;
}

// ============================================================================
// Profile
// ============================================================================

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const { data: badges } = await supabase
      .from("user_achievements")
      .select("badge, earned_at")
      .eq("user_id", userId);
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roleRow ?? []).some((r: any) => r.role === "admin");
    return { profile, badges: badges ?? [], isAdmin };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { username?: string; wallet_address?: string }) =>
    z
      .object({
        username: z.string().min(2).max(24).regex(/^[a-zA-Z0-9_]+$/).optional(),
        wallet_address: z.string().min(10).max(64).optional(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update(data).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================================
// Daily bonus
// ============================================================================

export const claimDaily = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("xp, streak, last_claim_at")
      .eq("user_id", userId)
      .single();
    if (error || !profile) throw new Error("Profile not found");

    const now = new Date();
    const last = profile.last_claim_at ? new Date(profile.last_claim_at as string) : null;
    if (last) {
      const hours = (now.getTime() - last.getTime()) / 36e5;
      if (hours < 24)
        return { ok: false, hoursLeft: Math.ceil(24 - hours), message: "Come back later" };
    }
    const continued = last && (now.getTime() - last.getTime()) / 36e5 < 48;
    const streak = continued ? (profile.streak as number) + 1 : 1;
    const reward = 25 + Math.min(streak * 5, 100);
    const xp = (profile.xp as number) + reward;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("profiles")
      .update({ xp, streak, last_claim_at: now.toISOString() })
      .eq("user_id", userId);

    const badges = await awardBadges(supabaseAdmin, userId, { xp, streak });
    return { ok: true, reward, xp, streak, badges };
  });

// ============================================================================
// Lucky Spin
// ============================================================================

export const spin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp, streak, last_spin_at")
      .eq("user_id", userId)
      .single();
    if (!profile) throw new Error("Profile not found");

    // Per-user cooldown: 24h between spins (free DAILY spin). Prevents scripted XP farming.
    const SPIN_COOLDOWN_MS = 24 * 60 * 60 * 1000;
    const last = profile.last_spin_at ? new Date(profile.last_spin_at as string) : null;
    if (last) {
      const elapsed = Date.now() - last.getTime();
      if (elapsed < SPIN_COOLDOWN_MS) {
        const hoursLeft = Math.ceil((SPIN_COOLDOWN_MS - elapsed) / 3_600_000);
        return { ok: false as const, cooldown: true as const, hoursLeft };
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { SPIN_REWARDS, pickWeighted } = await import("@/lib/games.server");
    const { count: prevSpins } = await supabaseAdmin
      .from("spins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const reward = pickWeighted(SPIN_REWARDS);
    const rewardIndex = SPIN_REWARDS.indexOf(reward);
    const newXp = (profile.xp as number) + reward.xp;

    await supabaseAdmin.from("spins").insert({ user_id: userId, reward: reward.label, xp: reward.xp });
    await supabaseAdmin
      .from("profiles")
      .update({ xp: newXp, last_spin_at: new Date().toISOString() })
      .eq("user_id", userId);
    const badges = await awardBadges(supabaseAdmin, userId, {
      xp: newXp,
      streak: profile.streak as number,
      firstSpin: (prevSpins ?? 0) === 0,
    });
    return { ok: true as const, reward, rewardIndex, xp: newXp, badges };
  });

// ============================================================================
// Coin Flip
// ============================================================================

export const flip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { guess: "heads" | "tails" }) =>
    z.object({ guess: z.enum(["heads", "tails"]) }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp, streak, last_flip_at")
      .eq("user_id", userId)
      .single();
    if (!profile) throw new Error("Profile not found");

    // Per-user cooldown: 5s between flips. Caps farming throughput without
    // breaking the rhythm of a quick game.
    const FLIP_COOLDOWN_MS = 5_000;
    const last = profile.last_flip_at ? new Date(profile.last_flip_at as string) : null;
    if (last) {
      const elapsed = Date.now() - last.getTime();
      if (elapsed < FLIP_COOLDOWN_MS) {
        const secondsLeft = Math.ceil((FLIP_COOLDOWN_MS - elapsed) / 1000);
        return { ok: false as const, cooldown: true as const, secondsLeft };
      }
    }

    const result: "heads" | "tails" = Math.random() < 0.5 ? "heads" : "tails";
    const won = result === data.guess;
    const xpDelta = won ? 30 : 5;
    const newXp = (profile.xp as number) + xpDelta;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("flips")
      .insert({ user_id: userId, guess: data.guess, result, won, xp: xpDelta });
    await supabaseAdmin
      .from("profiles")
      .update({ xp: newXp, last_flip_at: new Date().toISOString() })
      .eq("user_id", userId);
    const badges = await awardBadges(supabaseAdmin, userId, {
      xp: newXp,
      streak: profile.streak as number,
    });
    return { ok: true as const, result, won, xp: newXp, xpDelta, badges };
  });

// ============================================================================
// Leaderboard
// ============================================================================

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.rpc("get_leaderboard");
    const rows = data ?? [];
    const myIndex = rows.findIndex((r: { user_id: string }) => r.user_id === userId);
    return { rows, myRank: myIndex >= 0 ? myIndex + 1 : null };
  });

// ============================================================================
// Referrals
// ============================================================================

export const applyReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { code: string }) =>
    z.object({ code: z.string().min(4).max(16) }).parse(d)
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: me } = await supabase
      .from("profiles")
      .select("referred_by, created_at")
      .eq("user_id", userId)
      .single();
    if (!me) throw new Error("Profile not found");
    if (me.referred_by) return { ok: false, message: "You already used a referral" };

    const { data: referrer } = await supabase
      .from("profiles")
      .select("user_id, xp")
      .eq("referral_code", data.code.toLowerCase())
      .maybeSingle();
    if (!referrer) return { ok: false, message: "Invalid code" };
    if (referrer.user_id === userId) return { ok: false, message: "Cannot refer yourself" };

    const REWARD = 200;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("referrals").insert({
      referrer_id: referrer.user_id,
      referred_id: userId,
    });
    await supabaseAdmin.from("profiles").update({ referred_by: referrer.user_id }).eq("user_id", userId);
    await supabaseAdmin.rpc; // noop, placeholder for future
    await supabaseAdmin
      .from("profiles")
      .update({ xp: (referrer.xp as number) + REWARD })
      .eq("user_id", referrer.user_id);
    const { data: meProf } = await supabaseAdmin
      .from("profiles")
      .select("xp")
      .eq("user_id", userId)
      .single();
    await supabaseAdmin
      .from("profiles")
      .update({ xp: (meProf?.xp as number) + REWARD })
      .eq("user_id", userId);
    return { ok: true, reward: REWARD };
  });

// ============================================================================
// Admin
// ============================================================================

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("user_id, username, wallet_address, xp, streak, last_claim_at, created_at")
      .order("xp", { ascending: false })
      .limit(500);
    return { rows: data ?? [] };
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; xp?: number; streak?: number }) =>
    z
      .object({
        user_id: z.string().uuid(),
        xp: z.number().int().min(0).max(10_000_000).optional(),
        streak: z.number().int().min(0).max(1000).optional(),
      })
      .parse(d)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const update: { xp?: number; streak?: number } = {};
    if (data.xp !== undefined) update.xp = data.xp;
    if (data.streak !== undefined) update.streak = data.streak;
    await supabaseAdmin.from("profiles").update(update).eq("user_id", data.user_id);
    return { ok: true };
  });

export const adminGrantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; role: "admin" | "user" }) =>
    z.object({ user_id: z.string().uuid(), role: z.enum(["admin", "user"]) }).parse(d)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
    return { ok: true };
  });
