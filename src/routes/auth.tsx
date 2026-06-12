import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Gamepad2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Resident Arcade" },
      {
        name: "description",
        content:
          "Sign in to Resident Arcade to play instant Base-native games, earn XP, build daily streaks, and climb the leaderboard.",
      },
      { property: "og:title", content: "Sign in — Resident Arcade" },
      {
        property: "og:description",
        content:
          "Sign in to Resident Arcade and start earning XP on Base. Daily streaks, instant games, leaderboards.",
      },
      { property: "og:url", content: "https://base-arcade-quest.lovable.app/auth" },
    ],
    links: [
      { rel: "canonical", href: "https://base-arcade-quest.lovable.app/auth" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.navigate({ to: "/app" });
    });
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) localStorage.setItem("ra_ref", ref);
    }
  }, [router]);

  const google = async () => {
    setLoading(true);
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/app",
    });
    if (r.error) toast.error(r.error.message);
    if (!r.redirected && !r.error) router.navigate({ to: "/app" });
    setLoading(false);
  };

  const emailAuth = async (mode: "signin" | "signup") => {
    setLoading(true);
    const fn = mode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
    const opts: any = mode === "signup"
      ? { email, password, options: { emailRedirectTo: window.location.origin + "/app", data: { name: email.split("@")[0] } } }
      : { email, password };
    const { error } = await fn(opts);
    if (error) toast.error(error.message);
    else router.navigate({ to: "/app" });
    setLoading(false);
  };

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" aria-label="Resident Arcade home" className="flex items-center justify-center gap-2 mb-8">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--gradient-neon)] shadow-[var(--shadow-glow)] animate-float">
            <Gamepad2 className="h-6 w-6 text-background" />
          </span>
        </Link>
        <h1 className="text-center text-3xl font-black tracking-tight">
          <span className="gradient-text">Resident Arcade</span>
        </h1>
        <p className="text-center text-muted-foreground mt-1 mb-8 text-sm">Play. Earn. Flex.</p>

        <div className="glass-strong rounded-2xl p-6 space-y-4">
          <button
            onClick={google}
            disabled={loading}
            className="w-full rounded-xl bg-[var(--gradient-neon)] text-background font-semibold py-3 hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" /> Continue with Google
          </button>

          <div className="relative my-2 text-center text-xs text-muted-foreground">
            <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
            <span className="relative bg-card/0 px-3">or email</span>
          </div>

          <input
            type="email"
            placeholder="you@base.app"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl glass px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--neon)]"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl glass px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--neon)]"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => emailAuth("signin")}
              disabled={loading || !email || !password}
              className="rounded-xl glass py-2.5 text-sm font-medium hover:bg-white/10 disabled:opacity-50"
            >
              Sign in
            </button>
            <button
              onClick={() => emailAuth("signup")}
              disabled={loading || !email || !password}
              className="rounded-xl glass py-2.5 text-sm font-medium hover:bg-white/10 disabled:opacity-50"
            >
              Create account
            </button>
          </div>
        </div>

        <p className="text-center mt-6 text-xs text-muted-foreground">
          Connect your Base Smart Wallet after signing in to start earning onchain.
        </p>
      </div>
    </div>
  );
}