import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPredictState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: markets }, { data: picks }, { data: profile }, { data: isAdmin }] = await Promise.all([
      supabase.from("predict_markets").select("*").order("closes_at", { ascending: true }).limit(50),
      supabase.from("predict_picks").select("market_id, side, correct, xp").eq("user_id", userId),
      supabase
        .from("profiles")
        .select("xp, predict_streak, predict_correct, predict_resolved")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    ]);
    return { markets: markets ?? [], picks: picks ?? [], profile, isAdmin: !!isAdmin };
  });

export const placePick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ marketId: z.string().min(1).max(64), side: z.enum(["yes", "no"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r, error } = await supabaseAdmin.rpc("place_predict_pick", {
      _user_id: context.userId,
      _market_id: data.marketId,
      _side: data.side,
    });
    if (error) throw new Error("Could not save your pick.");
    return r as { ok: boolean; reason?: string };
  });

async function requireAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const resolveMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ marketId: z.string().min(1).max(64), outcome: z.enum(["yes", "no"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: r, error } = await supabaseAdmin.rpc("resolve_predict_market", {
      _market_id: data.marketId,
      _outcome: data.outcome,
    });
    if (error) throw new Error("Could not resolve market.");
    return r as { ok: boolean; reason?: string; picks?: number };
  });

export const createMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        question: z.string().trim().min(8).max(200),
        category: z.enum(["Crypto", "Onchain", "Social"]),
        cadence: z.enum(["daily", "weekly"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const days = data.cadence === "daily" ? 1 : 7;
    const id = `${data.cadence}-${Date.now().toString(36)}`;
    const { error } = await supabaseAdmin.from("predict_markets").insert({
      id,
      question: data.question,
      category: data.category,
      cadence: data.cadence,
      closes_at: new Date(Date.now() + days * 86400000).toISOString(),
    });
    if (error) throw new Error("Could not create market.");
    return { ok: true, id };
  });
