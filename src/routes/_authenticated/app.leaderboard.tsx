import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLeaderboard } from "@/lib/games.functions";
import { Trophy, Flame } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — Resident Arcade" }] }),
  component: Leaderboard,
});

function Leaderboard() {
  const fn = useServerFn(getLeaderboard);
  const { data, isLoading } = useQuery({ queryKey: ["lb"], queryFn: () => fn() });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black gradient-text">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">Top 100 players, globally.</p>
        </div>
        {data?.myRank && (
          <div className="glass rounded-full px-3 py-1.5 text-sm">
            You: <span className="font-bold">#{data.myRank}</span>
          </div>
        )}
      </header>

      <div className="glass-strong rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_70px_70px] gap-3 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground border-b border-white/5">
          <div>#</div><div>Player</div><div className="text-right">XP</div><div className="text-right">Streak</div>
        </div>
        {isLoading && <div className="p-6 text-center text-muted-foreground text-sm">Loading…</div>}
        {data?.rows.map((row: any, i: number) => (
          <div
            key={row.user_id}
            className={`grid grid-cols-[40px_1fr_70px_70px] gap-3 px-4 py-3 text-sm items-center border-b border-white/5 last:border-0 ${
              i < 3 ? "bg-white/[0.03]" : ""
            }`}
          >
            <div className="font-mono font-bold">
              {i === 0 ? <Trophy className="h-4 w-4 text-[var(--gold)]" /> : `#${i + 1}`}
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate">{row.username ?? "Player"}</div>
              <div className="font-mono text-[10px] text-muted-foreground truncate">
                {row.wallet_address ?? "—"}
              </div>
            </div>
            <div className="text-right font-mono tabular-nums font-bold">{row.xp.toLocaleString()}</div>
            <div className="text-right font-mono tabular-nums text-muted-foreground flex items-center justify-end gap-1">
              <Flame className="h-3 w-3" />{row.streak}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}