import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Share2, Target } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/predict")({
  head: () => ({
    meta: [
      { title: "PredictX — Resident Arcade" },
      {
        name: "description",
        content: "Free-to-play prediction game. Call crypto, onchain and social outcomes for fun.",
      },
      { property: "og:title", content: "PredictX — Resident Arcade" },
      { property: "og:description", content: "Call the outcome. Accuracy is the flex." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PredictPage,
});

type Side = "yes" | "no";
type Pick = { side: Side; confidence: number };

const MARKETS = [
  { id: "eth-5k", q: "Will ETH close above $5,000 this week?", cat: "Crypto" },
  { id: "base-tvl", q: "Will Base TVL hit a new all-time high this month?", cat: "Onchain" },
  { id: "btc-dom", q: "Will BTC dominance rise above 60% by Friday?", cat: "Crypto" },
  { id: "fc-users", q: "Will Farcaster daily casts exceed 1M this week?", cat: "Social" },
  { id: "gas-low", q: "Will Base gas stay under 0.01 gwei all weekend?", cat: "Onchain" },
  { id: "meme-flip", q: "Will a new memecoin flip a top-20 token this month?", cat: "Social" },
];

const KEY = "predictx:v1";

function PredictPage() {
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [res, setRes] = useState<Record<string, Side>>({});
  const [tab, setTab] = useState<"markets" | "stats">("markets");

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      setPicks(s.picks ?? {});
      setRes(s.res ?? {});
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ picks, res }));
  }, [picks, res]);

  const stats = useMemo(() => {
    let correct = 0;
    let total = 0;
    for (const [id, p] of Object.entries(picks)) {
      if (res[id]) {
        total++;
        if (res[id] === p.side) correct++;
      }
    }
    return { correct, total, count: Object.keys(picks).length, acc: total ? (correct / total) * 100 : 0 };
  }, [picks, res]);

  const pick = (id: string, side: Side) => {
    if (res[id]) return;
    setPicks((p) => ({ ...p, [id]: { side, confidence: p[id]?.confidence ?? 50 } }));
  };

  const share = (id: string) => {
    const m = MARKETS.find((x) => x.id === id)!;
    const p = picks[id];
    const text = `I called ${p ? p.side.toUpperCase() : "?"} on "${m.q}" in PredictX on Resident Arcade 🎯`;
    const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent("https://base-arcade-quest.lovable.app/")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-28">
      <header className="mb-5">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-[var(--neon)]" />
          <h1 className="text-3xl font-black gradient-text">PredictX</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Social prediction game · free to play · no money, no wagers
        </p>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          { k: "Calls", v: stats.count },
          { k: "Resolved", v: stats.total },
          { k: "Accuracy", v: stats.total ? `${stats.acc.toFixed(0)}%` : "—" },
        ].map((s) => (
          <div key={s.k} className="glass rounded-xl p-3 text-center">
            <div className="text-xl font-black gradient-text">{s.v}</div>
            <div className="text-xs text-muted-foreground">{s.k}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        {(["markets", "stats"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize transition ${
              tab === t ? "bg-white/10 text-foreground" : "text-muted-foreground hover:bg-white/5"
            }`}
          >
            {t === "stats" ? "My record" : "Markets"}
          </button>
        ))}
      </div>

      {tab === "markets" ? (
        <div className="space-y-3">
          {MARKETS.map((m) => {
            const p = picks[m.id];
            const r = res[m.id];
            return (
              <div key={m.id} className="glass rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--neon)]">{m.cat}</span>
                    <h2 className="mt-1 font-semibold">{m.q}</h2>
                  </div>
                  <button
                    onClick={() => share(m.id)}
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
                      disabled={!!r}
                      onClick={() => pick(m.id, s)}
                      className={`rounded-xl py-2 font-bold uppercase transition disabled:opacity-60 ${
                        p?.side === s
                          ? "bg-[var(--gradient-neon)] text-background shadow-[var(--shadow-glow)]"
                          : "glass hover:bg-white/10"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {r && (
                  <p className="mt-2 text-sm">
                    Resolved <b className="uppercase">{r}</b> —{" "}
                    {p ? (p.side === r ? "✅ You called it" : "❌ Missed") : "no call"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass rounded-2xl p-5 text-sm">
          <p>
            {stats.correct} correct of {stats.total} resolved calls.
          </p>
          <button
            onClick={() => {
              setPicks({});
              setRes({});
              toast.success("Record cleared");
            }}
            className="mt-3 rounded-lg glass px-3 py-1.5 hover:bg-white/10"
          >
            Reset record
          </button>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-dashed border-white/10 p-3">
        <p className="mb-2 text-xs text-muted-foreground">Demo resolution (simulates an oracle)</p>
        <div className="flex flex-wrap gap-2">
          {MARKETS.map((m) => (
            <div key={m.id} className="flex items-center gap-1 text-xs">
              <span className="max-w-[80px] truncate text-muted-foreground">{m.id}</span>
              {(["yes", "no"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setRes((x) => ({ ...x, [m.id]: s }))}
                  className="rounded border border-white/15 px-2 py-0.5 uppercase hover:bg-white/10"
                >
                  {s}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        For fun only. No USDC, deposits, wagers or prizes. Calls are saved on this device.
      </p>
    </div>
  );
}
