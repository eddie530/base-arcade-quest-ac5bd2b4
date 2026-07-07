import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/games.functions";
import { ShareButtons } from "@/components/arcade/ShareButtons";
import { BadgeGrid } from "@/components/arcade/BadgeGrid";
import { WalletButton } from "@/components/arcade/WalletButton";
import { Flame, Sparkles, Trophy, CircleDot, Gamepad2, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/spinbase")({
  head: () => ({
    meta: [
      { title: "SpinBase — Resident Arcade" },
      {
        name: "description",
        content:
          "SpinBase: your Base-native spin hub. Track XP, streaks, and badges while you spin to win on Base.",
      },
      { property: "og:title", content: "SpinBase — Resident Arcade" },
      {
        property: "og:description",
        content: "Spin the wheel, flip coins, and climb the Base-native arcade leaderboard.",
      },
      { property: "og:url", content: "https://base-arcade-quest.lovable.app/app/spinbase" },
    ],
    links: [{ rel: "canonical", href: "https://base-arcade-quest.lovable.app/app/spinbase" }],
  }),
  component: SpinBase,
});

function SpinBase() {
  const fetchProfile = useServerFn(getMyProfile);
  const { data } = useQuery({ queryKey: ["me"], queryFn: () => fetchProfile() });

  const profile = data?.profile;
  const xp = profile?.xp ?? 0;
  const streak = profile?.streak ?? 0;

  return (
    <div className="space-y-5">
      <h1 className="sr-only">SpinBase</h1>

      {/* Profile card */}
      <section className="glass-strong rounded-3xl p-5 sm:p-6 overflow-hidden relative">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[var(--gradient-neon)] opacity-20 blur-3xl pointer-events-none" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground mb-2">
              <Zap className="h-3 w-3 text-[var(--neon)]" />
              SpinBase · Base-native
            </div>
            <h2 className="truncate text-2xl font-black gradient-text">SpinBase</h2>
            <p className="font-mono text-xs text-muted-foreground truncate mt-1">
              {profile?.wallet_address ?? "no wallet linked"}
            </p>
          </div>
          <div className="shrink-0">
            <WalletButton currentAddress={profile?.wallet_address} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-4">
          <Stat icon={Sparkles} label="XP" value={xp.toLocaleString()} accent />
          <Stat icon={Flame} label="Streak" value={`${streak}d`} />
          <Stat icon={Trophy} label="Rank" value={"#" + ((data as any)?.myRank ?? "—")} />
        </div>
      </section>

      {/* Games */}
      <section className="grid grid-cols-2 gap-3">
        <GameTile
          to="/app/spin"
          Icon={CircleDot}
          title="Lucky Spin"
          sub="Win up to 1,000 XP"
          gradient
        />
        <GameTile to="/app/flip" Icon={Gamepad2} title="Coin Flip" sub="Heads or tails" />
      </section>

      {/* Share */}
      <section>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Flex on Farcaster</h3>
        <ShareButtons
          xp={xp}
          streak={streak}
          referralCode={profile?.referral_code}
          brand="SpinBase"
        />
      </section>

      {/* Achievements */}
      <section>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Achievements</h3>
        <BadgeGrid earned={data?.badges ?? []} />
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: any) {
  return (
    <div className={`glass rounded-xl p-3 ${accent ? "ring-1 ring-[var(--neon)]/40" : ""}`}>
      <Icon className="h-3.5 w-3.5 text-[var(--neon)] mb-1.5" />
      <div className="font-mono text-lg sm:text-xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function GameTile({ to, Icon, title, sub, gradient }: any) {
  return (
    <Link
      to={to}
      className={`group relative overflow-hidden rounded-2xl p-5 transition hover:scale-[1.02] ${
        gradient
          ? "bg-[var(--gradient-neon)] text-background shadow-[var(--shadow-glow)]"
          : "glass hover:bg-white/10"
      }`}
    >
      <Icon className="h-7 w-7 mb-3" />
      <div className="font-bold">{title}</div>
      <div className="text-xs opacity-80">{sub}</div>
    </Link>
  );
}
