import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Gamepad2, Sparkles, Trophy, CircleDot, Coins, Flame, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Resident Arcade — Play. Earn. Flex." },
      {
        name: "talentapp:project_verification",
        content:
          "9648cd617829f85351fe4b70e9ebaa60df63760f4192bec304504d836c6d400a2e2af240521b3fffedc502497dee277d89536b67e53301d91c323f9033f9206a",
      },
      {
        name: "description",
        content:
          "A Base-native arcade for the Farcaster era. Spin, flip, climb the ranks, and earn XP daily.",
      },
      { property: "og:title", content: "Resident Arcade — Play. Earn. Flex." },
      {
        property: "og:description",
        content: "Daily streaks, instant games, leaderboards. Connect your Base Smart Wallet.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://base-arcade-quest.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://base-arcade-quest.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Resident Arcade",
          url: "https://base-arcade-quest.lovable.app/",
          logo: "https://base-arcade-quest.lovable.app/frames/icon.png",
          sameAs: ["https://warpcast.com/"],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Resident Arcade",
          url: "https://base-arcade-quest.lovable.app/",
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2 font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--gradient-neon)] shadow-[var(--shadow-glow)]">
            <Gamepad2 className="h-4.5 w-4.5 text-background" />
          </span>
          <span className="gradient-text text-lg tracking-tight">Resident Arcade</span>
          <span className="text-lg tracking-tight text-muted-foreground/60">·</span>
          <span className="gradient-text text-lg tracking-tight">SpinBase</span>
        </div>
        <Link
          to="/auth"
          className="rounded-full bg-[var(--gradient-neon)] text-background font-semibold px-4 py-2 text-sm shadow-[var(--shadow-glow)] hover:opacity-90 transition"
        >
          Launch app
        </Link>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-4 pt-10 pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon-green)]" />
            Live on Base · Farcaster Mini App
          </div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-[0.95]">
            The arcade where
            <br />
            <span className="gradient-text">streaks pay out.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-muted-foreground">
            Quick games. Daily XP. Global leaderboards. Built for the Base ecosystem and ready to
            flex on Farcaster.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              className="rounded-full bg-[var(--gradient-neon)] text-background font-semibold px-6 py-3 shadow-[var(--shadow-glow)] hover:opacity-90 transition"
            >
              Play now <Zap className="inline h-4 w-4 ml-1 -mt-0.5" />
            </Link>
            <a
              href="#features"
              className="rounded-full glass px-6 py-3 font-medium hover:bg-white/10 transition"
            >
              What's inside
            </a>
          </div>

          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-3 sm:gap-6">
            {[
              { k: "Players", v: "1,200+" },
              { k: "XP earned", v: "4.2M" },
              { k: "Top streak", v: "87d" },
            ].map((s) => (
              <div key={s.k} className="glass rounded-2xl p-4">
                <div className="text-2xl sm:text-3xl font-black gradient-text">{s.v}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.k}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-5xl px-4 pb-24">
          <h2 className="sr-only">What's inside</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                Icon: CircleDot,
                t: "Lucky Spin",
                d: "Prize wheel with jackpot, double-XP and bonus spin tiers.",
              },
              {
                Icon: Coins,
                t: "Coin Flip",
                d: "Heads or tails. Risk-free vibes, fully animated.",
              },
              {
                Icon: Flame,
                t: "Daily Streaks",
                d: "Show up every 24h. Bigger streak, bigger payouts.",
              },
              { Icon: Trophy, t: "Leaderboards", d: "Top 100 onchain players. Climb and flex." },
              { Icon: Sparkles, t: "Badges", d: "Earn permanent badges as you level up." },
              {
                Icon: Gamepad2,
                t: "Base Native",
                d: "Coinbase Smart Wallet support out of the box.",
              },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="glass rounded-2xl p-5 hover:bg-white/[0.06] transition">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5">
                  <Icon className="h-5 w-5 text-[var(--neon)]" />
                </div>
                <h3 className="mt-4 font-semibold">{t}</h3>
                <p className="text-sm text-muted-foreground mt-1">{d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-muted-foreground">
        Resident Arcade · Built on Base
      </footer>
    </div>
  );
}
