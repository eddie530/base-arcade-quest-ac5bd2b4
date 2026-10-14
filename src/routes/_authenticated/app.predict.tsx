import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Flame, Lock, Share2, Target } from "lucide-react";
import { toast } from "sonner";
import { createMarket, getPredictState, placePick, resolveMarket } from "@/lib/predict.functions";
import { isMarketOpen, predictXp } from "@/lib/predict.logic";

export const Route = createFileRoute("/_authenticated/app/predict")({
  head: () => ({
    meta: [
      { title: "PredictX — Resident Arcade" },
      {
        name: "description",
        content: "Free-to-play prediction game. Call daily and weekly outcomes and earn XP for correct picks.",
      },
      { property: "og:title", content: "PredictX — Resident Arcade" },
      { property: "og:description", content: "Call the outcome. Earn XP. Build your streak." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PredictPage,
});

function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Closed";
  const h = Math.floor(ms / 3600000);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h ${Math.floor((ms % 3600000) / 60000)}m left`;
}

function PredictPage() {
  const qc = useQueryClient();
  const fetchState = useServerFn(getPredictState);
  const pickFn = useServerFn(placePick);
  const resolveFn = useServerFn(resolveMarket);
  const createFn = useServerFn(createMarket);
  const { data, isLoading } = useQuery({ queryKey: ["predict"], queryFn: () => fetchState() });
  const [tab, setTab] = useState<"open" | "resolved">("open");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["predict"] });
    qc.invalidateQueries({ queryKey: ["me"] });
  };

  const pick = useMutation({
    mutationFn: (v: { marketId: string; side: "yes" | "no" }) => pickFn({ data: v }),
    onSuccess: (r) => {
      if (!r.ok) toast.error(r.reason === "closed" ? "This question is closed." : "Couldn't save pick.");
      else toast.success("Pick locked in");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const resolve = useMutation({
    mutationFn: (v: { marketId: string; outcome: "yes" | "no" }) => resolveFn({ data: v }),
    onSuccess: (r) => {
      if (r.ok) toast.success(`Resolved · ${r.picks} picks scored`);
      else toast.error("Already resolved");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const picks = new Map((data?.picks ?? []).map((p) => [p.market_id, p]));
  const markets = (data?.markets ?? []).filter((m) =>
    tab === "open" ? !m.resolution : !!m.resolution,
  );
  const p = data?.profile;
  const streak = p?.predict_streak ?? 0;
  const acc = p?.predict_resolved ? Math.round(((p.predict_correct ?? 0) / p.predict_resolved) * 100) : null;

  const share = (q: string, side?: string) => {
    const text = `I called ${side ? side.toUpperCase() : "it"} on "${q}" in PredictX 🎯 ${streak}-call streak on Resident Arcade`;
    window.open(
      `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent("https://base-arcade-quest.lovable.app/share/score")}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-28">
      <header className="mb-5">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-[var(--neon)]" />
          <h1 className="text-3xl font-black gradient-text">PredictX</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Call daily & weekly outcomes. Correct calls earn free XP (points with no monetary value).
        </p>
      </header>

      <div className="mb-4 grid grid-cols-4 gap-2">
        {[
          { k: "XP", v: p?.xp ?? 0 },
          { k: "Streak", v: streak },
          { k: "Correct", v: p?.predict_correct ?? 0 },
          { k: "Accuracy", v: acc === null ? "—" : `${acc}%` },
        ].map((s) => (
          <div key={s.k} className="glass rounded-xl p-3 text-center">
            <div className="text-lg font-black gradient-text">{s.v}</div>
            <div className="text-[11px] text-muted-foreground">{s.k}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 glass rounded-xl p-3 text-xs text-muted-foreground flex items-start gap-2">
        <Flame className="h-4 w-4 shrink-0 text-[var(--neon)]" />
        <span>
          Correct call = 50 XP + 10 XP per streak step (max 100 XP). A wrong call resets your streak.
          Next correct call pays <b className="text-foreground">{predictXp(true, streak)} XP</b>. Badges at 5 and
          25 correct, and a 5-call streak.
        </span>
      </div>

      <div className="mb-4 flex gap-2">
        {(["open", "resolved"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize transition ${
              tab === t ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading questions…</p>}
      <div className="space-y-3">
        {markets.map((m) => {
          const mine = picks.get(m.id);
          const open = isMarketOpen(m);
          return (
            <div key={m.id} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--neon)]">
                    {m.category} · {m.cadence} · {m.resolution ? "Resolved" : timeLeft(m.closes_at)}
                  </span>
                  <h2 className="mt-1 font-semibold">{m.question}</h2>
                </div>
                <button
                  onClick={() => share(m.question, mine?.side)}
                  aria-label="Share to Farcaster"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full glass hover:bg-white/10"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["yes", "no"] as const).map((s) => (
                  <button
                    key={s}
                    disabled={!open || pick.isPending}
                    onClick={() => pick.mutate({ marketId: m.id, side: s })}
                    className={`rounded-xl py-2 font-bold uppercase transition disabled:opacity-60 ${
                      mine?.side === s
                        ? "bg-[var(--gradient-neon)] text-background shadow-[var(--shadow-glow)]"
                        : "glass hover:bg-white/10"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {m.resolution && (
                <p className="mt-2 text-sm">
                  Answer: <b className="uppercase">{m.resolution}</b> —{" "}
                  {mine ? (mine.correct ? `✅ +${mine.xp} XP` : "❌ Missed") : "no call"}
                </p>
              )}
              {data?.isAdmin && !m.resolution && (
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Admin: resolve as</span>
                  {(["yes", "no"] as const).map((o) => (
                    <button
                      key={o}
                      disabled={resolve.isPending}
                      onClick={() => {
                        if (confirm(`Resolve "${m.question}" as ${o.toUpperCase()}? This awards XP and can't be undone.`))
                          resolve.mutate({ marketId: m.id, outcome: o });
                      }}
                      className="rounded border border-white/15 px-2 py-0.5 uppercase hover:bg-white/10"
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!isLoading && markets.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here yet.</p>
        )}
      </div>

      {data?.isAdmin && <NewMarket onCreate={(v) => createFn({ data: v }).then(refresh)} />}

      <div className="mt-8 glass rounded-2xl p-4 opacity-80">
        <div className="flex items-center gap-2 font-semibold">
          <Lock className="h-4 w-4" /> Real-money predictions — DISABLED
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Questions and scoring are ready, but USDC stakes and payouts are switched off. They require
          legal sign-off, a license, age/location checks and identity verification first. No deposits,
          wagers or prizes are possible today.
        </p>
      </div>
    </div>
  );
}

function NewMarket({
  onCreate,
}: {
  onCreate: (v: { question: string; category: "Crypto" | "Onchain" | "Social"; cadence: "daily" | "weekly" }) => Promise<unknown>;
}) {
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState<"Crypto" | "Onchain" | "Social">("Crypto");
  const [cadence, setCadence] = useState<"daily" | "weekly">("daily");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-6 glass rounded-2xl p-4 space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onCreate({ question, category, cadence });
          setQuestion("");
          toast.success("Question published");
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="font-semibold text-sm">Admin · New question</h2>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Will … ?"
        aria-label="Question"
        className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value as never)} className="rounded-lg bg-white/5 px-2 py-1.5 text-sm">
          <option>Crypto</option>
          <option>Onchain</option>
          <option>Social</option>
        </select>
        <select aria-label="Cadence" value={cadence} onChange={(e) => setCadence(e.target.value as never)} className="rounded-lg bg-white/5 px-2 py-1.5 text-sm">
          <option value="daily">Daily (closes in 24h)</option>
          <option value="weekly">Weekly (closes in 7d)</option>
        </select>
        <button disabled={busy || question.trim().length < 8} className="ml-auto rounded-lg bg-[var(--gradient-neon)] px-3 py-1.5 text-sm font-semibold text-background disabled:opacity-50">
          Publish
        </button>
      </div>
    </form>
  );
}
