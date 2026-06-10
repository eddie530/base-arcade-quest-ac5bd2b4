import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { spin, SPIN_REWARDS } from "@/lib/games.functions";
import { toast } from "sonner";
import { Sparkles, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/spin")({
  head: () => ({ meta: [{ title: "Lucky Spin — Resident Arcade" }] }),
  component: SpinPage,
});

const SLICE_COLORS = [
  "oklch(0.72 0.21 245)",
  "oklch(0.78 0.22 200)",
  "oklch(0.72 0.27 340)",
  "oklch(0.85 0.18 90)",
  "oklch(0.82 0.22 150)",
  "oklch(0.68 0.22 280)",
  "oklch(0.78 0.25 30)",
];

function SpinPage() {
  const qc = useQueryClient();
  const spinFn = useServerFn(spin);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const sliceAngle = 360 / SPIN_REWARDS.length;

  const mut = useMutation({
    mutationFn: () => spinFn(),
    onMutate: () => setSpinning(true),
    onSuccess: (r: any) => {
      // land the index at top (pointer is at top, slice center at -90deg + i*sliceAngle)
      const target = 360 * 6 + (360 - r.rewardIndex * sliceAngle - sliceAngle / 2);
      setRotation((prev) => prev + target);
      setTimeout(() => {
        setSpinning(false);
        setResult(r);
        if (r.reward.kind === "jackpot") {
          confetti({ particleCount: 220, spread: 100, origin: { y: 0.6 } });
        } else if (r.reward.xp >= 50) {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        }
        if (r.badges?.length) toast("New badge unlocked!");
        qc.invalidateQueries({ queryKey: ["me"] });
      }, 4200);
    },
    onError: (e: any) => {
      setSpinning(false);
      toast.error(e.message);
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight gradient-text">Lucky Spin</h1>
        <p className="text-sm text-muted-foreground">Free daily spin. Land on the jackpot.</p>
      </header>

      <div className="relative mx-auto aspect-square w-full max-w-md glass-strong rounded-3xl p-6 grid place-items-center">
        {/* Pointer */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-[var(--neon)] drop-shadow-[0_0_8px_var(--neon)]" />

        <motion.div
          className="relative aspect-square w-full rounded-full overflow-hidden shadow-[var(--shadow-glow)]"
          animate={{ rotate: rotation }}
          transition={{ duration: 4, ease: [0.16, 1, 0.3, 1] }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {SPIN_REWARDS.map((r, i) => {
              const start = i * sliceAngle - 90;
              const end = start + sliceAngle;
              const x1 = 100 + 100 * Math.cos((start * Math.PI) / 180);
              const y1 = 100 + 100 * Math.sin((start * Math.PI) / 180);
              const x2 = 100 + 100 * Math.cos((end * Math.PI) / 180);
              const y2 = 100 + 100 * Math.sin((end * Math.PI) / 180);
              const mid = start + sliceAngle / 2;
              const tx = 100 + 60 * Math.cos((mid * Math.PI) / 180);
              const ty = 100 + 60 * Math.sin((mid * Math.PI) / 180);
              return (
                <g key={i}>
                  <path
                    d={`M100 100 L${x1} ${y1} A100 100 0 0 1 ${x2} ${y2} Z`}
                    fill={SLICE_COLORS[i % SLICE_COLORS.length]}
                    stroke="oklch(0.16 0.04 265)"
                    strokeWidth="1"
                  />
                  <text
                    x={tx}
                    y={ty}
                    fill="oklch(0.13 0.06 265)"
                    fontSize="9"
                    fontWeight="800"
                    textAnchor="middle"
                    transform={`rotate(${mid + 90} ${tx} ${ty})`}
                  >
                    {r.label}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="h-10 w-10 rounded-full bg-background border-2 border-[var(--neon)] grid place-items-center">
              <Sparkles className="h-4 w-4 text-[var(--neon)]" />
            </div>
          </div>
        </motion.div>
      </div>

      <button
        disabled={spinning || mut.isPending}
        onClick={() => mut.mutate()}
        className="mx-auto block rounded-full bg-[var(--gradient-neon)] text-background font-bold px-10 py-4 shadow-[var(--shadow-glow)] hover:opacity-90 disabled:opacity-40 transition"
      >
        {spinning ? "Spinning…" : "Spin the wheel"}
      </button>

      {result && !spinning && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-md p-4"
          onClick={() => setResult(null)}
        >
          <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setResult(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">You landed on</div>
            <div className="text-5xl font-black gradient-text mt-2">{result.reward.label}</div>
            <div className="mt-4 text-2xl font-bold">+{result.reward.xp} XP</div>
            <div className="text-sm text-muted-foreground mt-1">Total: {result.xp.toLocaleString()} XP</div>
            <button
              onClick={() => setResult(null)}
              className="mt-6 w-full rounded-full bg-[var(--gradient-neon)] text-background font-semibold py-3"
            >
              Continue
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}