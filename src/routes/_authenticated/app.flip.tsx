import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { flip } from "@/lib/games.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/flip")({
  head: () => ({ meta: [{ title: "Coin Flip — Resident Arcade" }] }),
  component: FlipPage,
});

function FlipPage() {
  const qc = useQueryClient();
  const flipFn = useServerFn(flip);
  const [rot, setRot] = useState(0);
  const [showing, setShowing] = useState<"heads" | "tails">("heads");
  const [busy, setBusy] = useState(false);

  const mut = useMutation({
    mutationFn: (guess: "heads" | "tails") => flipFn({ data: { guess } }),
    onMutate: () => setBusy(true),
    onSuccess: (r: any) => {
      if (r?.ok === false && r?.cooldown) {
        setBusy(false);
        toast.error(`Slow down — flip again in ${r.secondsLeft}s`);
        return;
      }
      // spin 6 full turns + land on result (heads = 0, tails = 180)
      const targetSide = r.result === "heads" ? 0 : 180;
      const next = rot + 360 * 6 + (targetSide - (rot % 360) + 360) % 360;
      setRot(next);
      setTimeout(() => {
        setShowing(r.result);
        setBusy(false);
        if (r.won) {
          confetti({ particleCount: 100, spread: 75, origin: { y: 0.6 } });
          toast.success(`+${r.xpDelta} XP — you nailed it`);
        } else {
          toast(`+${r.xpDelta} XP — try again`);
        }
        qc.invalidateQueries({ queryKey: ["me"] });
      }, 2200);
    },
    onError: (e: any) => {
      setBusy(false);
      toast.error(e.message);
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight gradient-text">Coin Flip</h1>
        <p className="text-sm text-muted-foreground">Guess right, win 30 XP. Either way you score.</p>
      </header>

      <div className="mx-auto aspect-square w-64 sm:w-80 perspective-[1200px] grid place-items-center">
        <motion.div
          className="relative h-full w-full"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: rot }}
          transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
        >
          <CoinFace label="HEADS" hidden={showing !== "heads"} />
          <CoinFace label="TAILS" hidden={showing !== "tails"} flipped />
        </motion.div>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        <button
          disabled={busy}
          onClick={() => mut.mutate("heads")}
          className="rounded-2xl glass hover:bg-white/10 py-4 font-bold text-lg disabled:opacity-40"
        >
          Heads
        </button>
        <button
          disabled={busy}
          onClick={() => mut.mutate("tails")}
          className="rounded-2xl glass hover:bg-white/10 py-4 font-bold text-lg disabled:opacity-40"
        >
          Tails
        </button>
      </div>
    </div>
  );
}

function CoinFace({ label, flipped, hidden }: { label: string; flipped?: boolean; hidden?: boolean }) {
  return (
    <div
      className="absolute inset-0 rounded-full grid place-items-center text-3xl font-black"
      style={{
        backfaceVisibility: "hidden",
        transform: flipped ? "rotateY(180deg)" : undefined,
        background: "radial-gradient(circle at 30% 30%, oklch(0.85 0.18 90), oklch(0.55 0.18 60))",
        color: "oklch(0.18 0.05 60)",
        boxShadow: "0 20px 60px -10px oklch(0.85 0.18 90 / 0.5), inset 0 0 30px oklch(0 0 0 / 0.2)",
        opacity: hidden ? 1 : 1,
      }}
    >
      {label}
    </div>
  );
}