import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { HelpCircle, Volume2, VolumeX, Share2, Sparkles, Zap, X, Crown, Lock } from "lucide-react";
import confetti from "canvas-confetti";
import { getMyProfile } from "@/lib/games.functions";
import { getSlotsState, spinSlots } from "@/lib/slots.functions";
import {
  SLOT_SYMBOLS,
  SLOT_REELS,
  SLOT_ROWS,
  SLOT_DAILY_SPINS,
  SLOT_XP_CAP,
  SLOT_BONUS_MULTIPLIER,
  SLOT_BONUS_SPINS_AWARDED,
  SLOT_SCATTER_TRIGGER,
  RUN_MULTIPLIER,
  SCATTER_ID,
  lineHitChance,
  spinLineHitChance,
  tierChance,
  chanceWithin,
  JACKPOT_TIERS,
  SLOT_JACKPOT_CAP,
  symbolChance,
  type LineWin,
  type SlotGrid,
} from "@/lib/slots.logic";
import { shareUrl, warpcastCompose, miniAppMeta, APP_URL } from "@/lib/farcaster";

const TITLE = "Resident Slots — Resident Arcade";
const DESC =
  "Six reels, 14 arcade-space symbols and bonus rounds. 10 free spins a day for XP points with no monetary value.";

export const Route = createFileRoute("/_authenticated/app/slots")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: `${APP_URL}/app/slots` },
      ...miniAppMeta({
        imageUrl: `${APP_URL}/frames/slots.png`,
        buttonTitle: "🎰 Play Resident Slots",
        launchUrl: `${APP_URL}/app/slots`,
      }),
    ],
    links: [{ rel: "canonical", href: `${APP_URL}/app/slots` }],
  }),
  component: SlotsPage,
});

const randomGrid = (): SlotGrid =>
  Array.from({ length: SLOT_REELS }, () =>
    Array.from({ length: SLOT_ROWS }, () => Math.floor(Math.random() * 13)),
  );

function beep(freq: number, ms: number) {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.value = 0.04;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + ms / 1000);
    o.onended = () => ctx.close();
  } catch {
    /* audio unavailable */
  }
}

function SlotsPage() {
  const qc = useQueryClient();
  const fetchState = useServerFn(getSlotsState);
  const spin = useServerFn(spinSlots);
  const reduce = useReducedMotion();
  const { data: state } = useQuery({ queryKey: ["slots"], queryFn: () => fetchState() });
  const fetchMe = useServerFn(getMyProfile);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const [jackpotHit, setJackpotHit] = useState<{ xp: number; name: string } | null>(null);

  const [grid, setGrid] = useState<SlotGrid>(() =>
    Array.from({ length: SLOT_REELS }, (_, r) => [r % 13, (r + 4) % 13, (r + 8) % 13]),
  );
  const [stopped, setStopped] = useState<number>(SLOT_REELS);
  const [wins, setWins] = useState<LineWin[]>([]);
  const [result, setResult] = useState<string>("Press SPIN to play. Free XP points only.");
  const [lastXp, setLastXp] = useState(0);
  const [muted, setMuted] = useState(true);
  const [help, setHelp] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const spinning = stopped < SLOT_REELS;

  const mut = useMutation({
    mutationFn: () => spin(),
    onMutate: () => {
      setWins([]);
      setResult("Spinning…");
      setStopped(0);
    },
    onSuccess: (r) => {
      if (!r.ok) {
        setStopped(SLOT_REELS);
        setResult(r.message);
        toast.error(r.message);
        return;
      }
      const step = reduce ? 0 : 260;
      const base = reduce ? 0 : 500;
      let shuffle: number | undefined;
      if (!reduce) shuffle = window.setInterval(() => setGrid(randomGrid()), 70);
      for (let i = 0; i < SLOT_REELS; i++) {
        timers.current.push(
          window.setTimeout(
            () => {
              if (i === SLOT_REELS - 1 && shuffle) clearInterval(shuffle);
              setGrid((g) => {
                const next = i === SLOT_REELS - 1 ? r.grid : randomGrid();
                return next.map((col, idx) => (idx <= i ? r.grid[idx] : (g[idx] ?? col)));
              });
              setStopped(i + 1);
              if (!muted) beep(300 + i * 60, 60);
              if (i === SLOT_REELS - 1) finish(r);
            },
            base + step * i,
          ),
        );
      }
    },
    onError: (e: Error) => {
      setStopped(SLOT_REELS);
      setResult(e.message);
      toast.error(e.message);
    },
  });

  function finish(r: Extract<Awaited<ReturnType<typeof spinSlots>>, { ok: true }>) {
    setWins(r.wins);
    setLastXp(r.xp);
    const parts: string[] = [];
    if (r.xp > 0) parts.push(`+${r.xp} XP${r.isBonus ? ` (bonus x${SLOT_BONUS_MULTIPLIER})` : ""}`);
    else parts.push("No match this time");
    if (r.tier) {
      parts.unshift(`🏆 ${r.tier.name.toUpperCase()}`);
      setJackpotHit({ xp: r.xp, name: r.tier.name });
      if (!reduce)
        confetti({
          particleCount: r.jackpot ? 220 : 90,
          spread: r.jackpot ? 100 : 70,
          origin: { y: 0.5 },
        });
      if (!muted) [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 160), i * 170));
    }
    if (r.bonusAwarded) parts.push(`Bonus round! +${r.bonusAwarded} bonus spins`);
    setResult(parts.join(" · "));
    if (!muted && r.xp > 0) beep(880, 180);
    if (r.xp > 0) toast.success(`+${r.xp} XP`);
    if (r.bonusAwarded) toast(`🌀 Bonus round unlocked — ${r.bonusAwarded} spins at x2`);
    qc.invalidateQueries({ queryKey: ["slots"] });
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  const winCells = new Set(
    wins.flatMap((w) =>
      Array.from({ length: w.length }, (_, i) => `${(w.start ?? 0) + i}-${w.row}`),
    ),
  );
  const winRows = new Set(wins.map((w) => w.row));
  const bonusSpins = state?.bonusSpins ?? 0;
  const remaining = state?.remaining ?? SLOT_DAILY_SPINS;
  const outOfSpins = bonusSpins === 0 && remaining === 0;

  const shareText = `🎰 I just scored ${lastXp} XP on Resident Slots — ${(state?.xp ?? 0).toLocaleString()} XP total on Resident Arcade. Free-to-play points, no money involved.`;
  const shareHref = warpcastCompose(shareText, [shareUrl("slots", { xp: state?.xp ?? 0 })]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black gradient-text">Resident Slots</h1>
          <p className="text-xs text-muted-foreground">
            Free-to-play · XP points have no monetary value
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Turn sound on" : "Mute sound"}
            aria-pressed={!muted}
            className="grid h-10 w-10 place-items-center rounded-full glass hover:bg-white/10"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setHelp(true)}
            className="flex h-10 items-center gap-1.5 rounded-full glass px-4 text-sm hover:bg-white/10"
          >
            <HelpCircle className="h-4 w-4" /> How to Play
          </button>
        </div>
      </header>

      <section
        className="relative overflow-hidden rounded-2xl p-4 ring-1 ring-[var(--neon)]/50 bg-[image:var(--gradient-neon)] text-background shadow-[var(--shadow-glow)]"
        aria-label="Resident Jackpots"
      >
        <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">
          <span className="flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5" /> Resident Jackpots
          </span>
          <span className="normal-case tracking-normal">XP only · no cash, tokens or prizes</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {JACKPOT_TIERS.map((t) => (
            <div key={t.id} className="rounded-xl bg-background/15 p-2 text-center">
              <div className="text-[10px] font-bold uppercase opacity-80">{t.name}</div>
              <div className="font-mono text-lg font-black tabular-nums">
                {t.xp.toLocaleString()} XP
              </div>
              <div className="text-[10px] opacity-80">
                {t.id === "grand" ? `${t.scatters}+` : t.scatters} 🌀 · 1 in{" "}
                {Math.round(1 / tierChance(t)).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2" aria-label="Slots status">
        <StatusBox label="Daily spins" value={`${remaining}/${SLOT_DAILY_SPINS}`} />
        <StatusBox label="Bonus spins" value={String(bonusSpins)} highlight={bonusSpins > 0} />
        <StatusBox label="XP points" value={(state?.xp ?? 0).toLocaleString()} />
      </section>

      {/* Cabinet */}
      <section
        className={`relative rounded-3xl p-3 sm:p-5 glass-strong ring-1 ${
          bonusSpins > 0 ? "ring-[var(--neon)] shadow-[var(--shadow-glow)]" : "ring-white/10"
        }`}
        aria-label="Slot machine, six reels by three rows"
      >
        <div className="absolute -inset-px rounded-3xl bg-[image:var(--gradient-neon)] opacity-10 blur-xl pointer-events-none" />
        {bonusSpins > 0 && (
          <div className="relative mb-2 text-center text-xs font-bold tracking-widest text-[var(--neon)]">
            🌀 BONUS ROUND ACTIVE · x{SLOT_BONUS_MULTIPLIER} XP
          </div>
        )}
        <div className="relative grid grid-cols-6 gap-1.5 sm:gap-2" role="grid">
          {Array.from({ length: SLOT_ROWS }).map((_, row) =>
            grid.map((col, reel) => {
              const sym = SLOT_SYMBOLS[col[row]];
              const win = winCells.has(`${reel}-${row}`);
              const moving = spinning && reel >= stopped;
              return (
                <motion.div
                  key={`${reel}-${row}`}
                  role="gridcell"
                  aria-label={`Reel ${reel + 1}, row ${row + 1}: ${sym.name}`}
                  style={{ gridColumn: reel + 1, gridRow: row + 1 }}
                  animate={
                    reduce
                      ? {}
                      : moving
                        ? { y: [-6, 6, -6], filter: "blur(1.5px)" }
                        : win
                          ? { scale: [1, 1.08, 1], filter: "blur(0px)" }
                          : { y: 0, filter: "blur(0px)" }
                  }
                  transition={
                    moving
                      ? { repeat: Infinity, duration: 0.18 }
                      : { duration: 0.5, repeat: win ? 2 : 0 }
                  }
                  className={`aspect-square grid place-items-center rounded-xl text-2xl sm:text-4xl bg-background/60 ring-1 transition-colors ${
                    win
                      ? "ring-2 ring-[var(--neon)] bg-[var(--neon)]/15 shadow-[var(--shadow-glow)]"
                      : winRows.has(row)
                        ? "ring-[var(--neon)]/30"
                        : "ring-white/10"
                  } ${sym.id === SCATTER_ID ? "ring-accent" : ""}`}
                >
                  <span aria-hidden>{sym.glyph}</span>
                </motion.div>
              );
            }),
          )}
        </div>

        <p
          className="relative mt-3 min-h-[1.5rem] text-center text-sm font-semibold"
          role="status"
          aria-live="polite"
        >
          {result}
        </p>

        <button
          onClick={() => mut.mutate()}
          disabled={spinning || mut.isPending || outOfSpins}
          className="relative mt-3 w-full rounded-2xl bg-[image:var(--gradient-neon)] py-4 text-lg font-black tracking-widest text-background shadow-[var(--shadow-glow)] transition hover:opacity-90 disabled:opacity-40 disabled:shadow-none"
        >
          {spinning || mut.isPending
            ? "SPINNING…"
            : outOfSpins
              ? "NO SPINS LEFT TODAY"
              : bonusSpins > 0
                ? "SPIN (BONUS)"
                : "SPIN"}
        </button>
        {outOfSpins && (
          <p className="relative mt-2 text-center text-xs text-muted-foreground">
            New spins at 00:00 UTC. No purchases — ever.
          </p>
        )}
      </section>

      <div className="flex gap-2">
        <a
          href={shareHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-full glass py-2.5 text-sm hover:bg-white/10"
        >
          <Share2 className="h-4 w-4" /> Share results on Farcaster
        </a>
      </div>

      <section className="glass rounded-2xl p-4" aria-label="Recent results">
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Recent results</h2>
        {state?.recent?.length ? (
          <ul className="space-y-1.5 text-sm">
            {state.recent.map((s: any) => (
              <li key={s.id} className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {new Date(s.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {s.is_bonus && <span className="ml-2 text-[var(--neon)]">bonus</span>}
                  {s.bonus_awarded > 0 && <span className="ml-2">🌀 +{s.bonus_awarded}</span>}
                </span>
                <span className={`font-mono ${s.xp > 0 ? "text-[var(--neon)]" : ""}`}>
                  {s.xp >= 1000 ? "🏆 " : ""}
                  {s.xp > 0 ? `+${s.xp}` : "0"} XP
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No spins yet.</p>
        )}
      </section>

      {me?.isAdmin && <PaidSpinsPlaceholder />}

      {jackpotHit !== null && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="jp-title"
          className="fixed inset-0 z-50 grid place-items-center bg-background/85 p-6 backdrop-blur"
          onClick={() => setJackpotHit(null)}
        >
          <motion.div
            initial={reduce ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-strong w-full max-w-sm rounded-3xl p-6 text-center ring-2 ring-[var(--neon)] shadow-[var(--shadow-glow)]"
          >
            <div className="text-5xl" aria-hidden>
              🏆
            </div>
            <h2 id="jp-title" className="mt-2 text-2xl font-black gradient-text">
              {jackpotHit.name.toUpperCase()}!
            </h2>
            <p className="mt-1 font-mono text-3xl font-black">
              +{jackpotHit.xp.toLocaleString()} XP
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              XP points have no monetary value and cannot be redeemed.
            </p>
            <button
              onClick={() => setJackpotHit(null)}
              className="mt-4 w-full rounded-full bg-[image:var(--gradient-neon)] py-2.5 font-bold text-background"
            >
              Nice!
            </button>
          </motion.div>
        </div>
      )}

      {help && <HowToPlay onClose={() => setHelp(false)} />}
    </div>
  );
}

function StatusBox({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`glass rounded-xl p-3 ${highlight ? "ring-1 ring-[var(--neon)]" : ""}`}>
      <div className="font-mono text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function HowToPlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const hit = (lineHitChance() * 100).toFixed(2);
  const spinHit = (spinLineHitChance() * 100).toFixed(1);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="htp-title"
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="glass-strong max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="htp-title" className="text-xl font-black gradient-text">
            How to Play
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>
            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-[var(--neon)]" />
            {SLOT_DAILY_SPINS} free spins per UTC day. No purchases, wagers or wallet payments.
          </li>
          <li>
            3 paylines (top, middle, bottom). Each line pays its best run of 3+ identical adjacent
            symbols anywhere on the line.
          </li>
          <li>
            Run length multiplier: 3× = x{RUN_MULTIPLIER[3]}, 4× = x{RUN_MULTIPLIER[4]}, 5× = x
            {RUN_MULTIPLIER[5]}, 6× = x{RUN_MULTIPLIER[6]}.
          </li>
          <li>
            <Zap className="mr-1 inline h-3.5 w-3.5 text-[var(--neon)]" />
            Bonus round: {SLOT_SCATTER_TRIGGER}+ 🌀 Neon Cores anywhere award{" "}
            {SLOT_BONUS_SPINS_AWARDED} bonus spins paying x{SLOT_BONUS_MULTIPLIER}. Bonus spins
            don't use your daily allowance.
          </li>
          <li>
            <Crown className="mr-1 inline h-3.5 w-3.5 text-[var(--neon)]" />
            Jackpots (fixed XP, added on top of line wins, counted by 🌀 anywhere):
            <ul className="mt-1 ml-5 list-disc space-y-0.5">
              {JACKPOT_TIERS.map((t) => (
                <li key={t.id}>
                  {t.name}: {t.id === "grand" ? `${t.scatters}+` : `exactly ${t.scatters}`} 🌀 ={" "}
                  {t.xp.toLocaleString()} XP · about 1 in{" "}
                  {Math.round(1 / tierChance(t)).toLocaleString()} spins (
                  {(tierChance(t) * 100).toFixed(3)}%)
                </li>
              ))}
            </ul>
            Jackpot spins are capped at {SLOT_JACKPOT_CAP.toLocaleString()} XP including the bonus
            multiplier.
          </li>
          <li>
            Line wins are capped at {SLOT_XP_CAP} XP per spin. About {spinHit}% of spins pay line
            XP; most spins pay nothing.
          </li>
          <li>Chance a given payline hits 3+: about {hit}%.</li>
          <li>
            With {SLOT_DAILY_SPINS} spins a day, the chance of at least one Mini (or better) jackpot
            is about{" "}
            {(
              chanceWithin(
                tierChance(JACKPOT_TIERS[0]) +
                  tierChance(JACKPOT_TIERS[1]) +
                  tierChance(JACKPOT_TIERS[2]),
                SLOT_DAILY_SPINS,
              ) * 100
            ).toFixed(0)}
            % per day and{" "}
            {(
              chanceWithin(
                tierChance(JACKPOT_TIERS[0]) +
                  tierChance(JACKPOT_TIERS[1]) +
                  tierChance(JACKPOT_TIERS[2]),
                SLOT_DAILY_SPINS * 3,
              ) * 100
            ).toFixed(0)}
            % over 3 days. Nothing is guaranteed.
          </li>
          <li className="font-semibold text-foreground">
            XP are free in-app points with no monetary value and cannot be redeemed.
          </li>
        </ul>
        <h3 className="mt-4 mb-2 text-sm font-semibold">Paytable (XP for 3 in a row)</h3>
        <div className="grid grid-cols-2 gap-1.5 text-sm">
          {SLOT_SYMBOLS.map((s) => (
            <div
              key={s.id}
              className="glass flex items-center justify-between rounded-lg px-2 py-1.5"
            >
              <span>
                <span aria-hidden className="mr-1.5">
                  {s.glyph}
                </span>
                {s.name}
              </span>
              <span className="font-mono text-xs">
                {s.id === SCATTER_ID ? "Bonus" : `${s.base} XP`}
                <span className="ml-1 text-muted-foreground">
                  {(symbolChance(s.id) * 100).toFixed(1)}%
                </span>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Percentages are the chance of each symbol appearing in a single cell. Outcomes are drawn
          on the server with cryptographic randomness.
        </p>
      </div>
    </div>
  );
}

function PaidSpinsPlaceholder() {
  return (
    <section
      className="glass rounded-2xl p-4 ring-1 ring-white/10 opacity-80"
      aria-label="Paid spins (disabled, admin only)"
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Lock className="h-4 w-4" /> Paid spins & redeemable prizes — DISABLED
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase">
          Admin only
        </span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Not built and not available. Paid chance-based spins with valuable prizes are regulated
        gambling in many places (New York treats online casinos, including sweepstakes-style models,
        as unlawful). Launching requires jurisdiction-specific legal and licensing review, age and
        location checks, provable fairness, and payment/payout infrastructure.
      </p>
      <button
        disabled
        className="mt-3 w-full cursor-not-allowed rounded-full glass py-2 text-sm opacity-50"
      >
        Buy spins (disabled)
      </button>
    </section>
  );
}
