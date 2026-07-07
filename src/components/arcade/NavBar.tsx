import { Link, useRouter } from "@tanstack/react-router";
import { Gamepad2, Trophy, CircleDot, Sparkles, Shield, LogOut } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/games.functions";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/app", label: "Home", icon: Sparkles },
  { to: "/app/spin", label: "Spin", icon: CircleDot },
  { to: "/app/flip", label: "Flip", icon: Gamepad2 },
  { to: "/app/leaderboard", label: "Ranks", icon: Trophy },
] as const;

export function NavBar() {
  const router = useRouter();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchProfile(),
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass-strong border-b border-white/5">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/app" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--gradient-neon)] shadow-[var(--shadow-glow)]">
              <Gamepad2 className="h-4 w-4 text-background" />
            </span>
            <span className="hidden sm:inline gradient-text">Resident Arcade</span>
            <span className="hidden sm:inline text-muted-foreground/60">·</span>
            <span className="hidden sm:inline gradient-text">SpinBase</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
                activeProps={{ className: "text-foreground bg-white/10" }}
              >
                {n.label}
              </Link>
            ))}
            {data?.isAdmin && (
              <Link
                to="/app/admin"
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition flex items-center gap-1"
              >
                <Shield className="h-3.5 w-3.5" /> Admin
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full glass px-3 py-1 text-sm">
              <Sparkles className="h-3.5 w-3.5 text-[var(--neon)]" />
              <span className="font-mono tabular-nums">{data?.profile?.xp ?? 0}</span>
              <span className="text-muted-foreground">XP</span>
            </div>
            <button
              onClick={signOut}
              className="grid h-9 w-9 place-items-center rounded-full glass hover:bg-white/10"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed bottom-3 left-1/2 z-40 -translate-x-1/2 md:hidden">
        <div className="glass-strong flex items-center gap-1 rounded-full px-2 py-1.5 shadow-[var(--shadow-glow)]">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className="grid h-10 w-12 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                activeProps={{ className: "bg-[var(--gradient-neon)] text-background" }}
              >
                <Icon className="h-4.5 w-4.5" />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}