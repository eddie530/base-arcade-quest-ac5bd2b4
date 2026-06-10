import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  getMyProfile,
  claimDaily,
  applyReferral,
  updateProfile,
} from "@/lib/games.functions";
import { ShareButtons } from "@/components/arcade/ShareButtons";
import { BadgeGrid } from "@/components/arcade/BadgeGrid";
import { WalletButton } from "@/components/arcade/WalletButton";
import { toast } from "sonner";
import { Flame, Gift, Sparkles, Trophy, CircleDot, Gamepad2, Copy, Check, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({ component: Dashboard });

function Dashboard() {
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const claim = useServerFn(claimDaily);
  const refer = useServerFn(applyReferral);
  const save = useServerFn(updateProfile);

  const { data } = useQuery({ queryKey: ["me"], queryFn: () => fetchProfile() });

  const claimMut = useMutation({
    mutationFn: () => claim(),
    onSuccess: (r: any) => {
      if (!r.ok) toast.error(`Wait ${r.hoursLeft}h before claiming again`);
      else {
        toast.success(`+${r.reward} XP claimed`);
        if (r.badges?.length) toast(`New badge unlocked!`);
      }
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  // Auto-apply ref code saved on /auth
  useEffect(() => {
    const ref = typeof window !== "undefined" && localStorage.getItem("ra_ref");
    if (ref && data?.profile && !data.profile.referred_by) {
      refer({ data: { code: ref } }).then((r: any) => {
        if (r.ok) {
          toast.success(`+${r.reward} XP from referral`);
          localStorage.removeItem("ra_ref");
          qc.invalidateQueries({ queryKey: ["me"] });
        } else {
          localStorage.removeItem("ra_ref");
        }
      });
    }
  }, [data?.profile, refer, qc]);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  useEffect(() => setName(data?.profile?.username ?? ""), [data?.profile?.username]);

  const saveName = async () => {
    try {
      await save({ data: { username: name } });
      toast.success("Username updated");
      qc.invalidateQueries({ queryKey: ["me"] });
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const profile = data?.profile;
  const xp = profile?.xp ?? 0;
  const streak = profile?.streak ?? 0;

  const refLink =
    typeof window !== "undefined" && profile?.referral_code
      ? `${window.location.origin}/auth?ref=${profile.referral_code}`
      : "";
  const [copied, setCopied] = useState(false);
  const copyRef = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const canClaim = (() => {
    if (!profile?.last_claim_at) return true;
    const h = (Date.now() - new Date(profile.last_claim_at).getTime()) / 36e5;
    return h >= 24;
  })();

  return (
    <div className="space-y-5">
      {/* Profile card */}
      <section className="glass-strong rounded-3xl p-5 sm:p-6 overflow-hidden relative">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[var(--gradient-neon)] opacity-20 blur-3xl pointer-events-none" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="glass rounded-md px-2 py-1 text-lg font-bold min-w-0"
                  />
                  <button onClick={saveName} className="text-xs rounded-md bg-[var(--gradient-neon)] text-background px-2 py-1 font-semibold">
                    Save
                  </button>
                </>
              ) : (
                <>
                  <h2 className="truncate text-2xl font-black">{profile?.username ?? "—"}</h2>
                  <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
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

      {/* Daily bonus */}
      <section className="glass rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Daily Bonus</div>
          <div className="font-semibold mt-0.5">
            {canClaim ? "Your daily XP is ready" : "Come back tomorrow"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Streak increases your reward.
          </div>
        </div>
        <button
          disabled={!canClaim || claimMut.isPending}
          onClick={() => claimMut.mutate()}
          className="shrink-0 rounded-full bg-[var(--gradient-neon)] text-background font-semibold px-5 py-2.5 shadow-[var(--shadow-glow)] hover:opacity-90 disabled:opacity-40 disabled:shadow-none transition flex items-center gap-2"
        >
          <Gift className="h-4 w-4" />
          Claim Daily XP
        </button>
      </section>

      {/* Games */}
      <section className="grid grid-cols-2 gap-3">
        <GameTile to="/app/spin" Icon={CircleDot} title="Lucky Spin" sub="Win up to 1,000 XP" gradient />
        <GameTile to="/app/flip" Icon={Gamepad2} title="Coin Flip" sub="Heads or tails" />
      </section>

      {/* Share */}
      <section>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Flex on Farcaster</h3>
        <ShareButtons xp={xp} streak={streak} referralCode={profile?.referral_code} />
      </section>

      {/* Achievements */}
      <section>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Achievements</h3>
        <BadgeGrid earned={data?.badges ?? []} />
      </section>

      {/* Referrals */}
      <section className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Your referral link</div>
            <div className="font-mono text-xs truncate mt-1">{refLink || "—"}</div>
          </div>
          <button onClick={copyRef} className="shrink-0 rounded-full glass px-4 py-2 text-sm hover:bg-white/10 flex items-center gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Invite a friend. Both of you get +200 XP when they sign in.
        </p>
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