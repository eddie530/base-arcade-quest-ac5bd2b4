import { Star, Flame, Trophy, Crown, Sparkles, Lock } from "lucide-react";

const ALL = [
  { id: "first_spin", label: "First Spin", Icon: Sparkles },
  { id: "streak_7", label: "7 Day Streak", Icon: Flame },
  { id: "streak_30", label: "30 Day Streak", Icon: Star },
  { id: "xp_master", label: "XP Master", Icon: Trophy },
  { id: "arcade_legend", label: "Arcade Legend", Icon: Crown },
];

export function BadgeGrid({ earned }: { earned: { badge: string }[] }) {
  const ids = new Set(earned.map((b) => b.badge));
  return (
    <div className="grid grid-cols-5 gap-2">
      {ALL.map((b) => {
        const has = ids.has(b.id);
        const Icon = has ? b.Icon : Lock;
        return (
          <div
            key={b.id}
            className={`relative aspect-square rounded-xl border p-2 grid place-items-center text-center transition ${
              has
                ? "bg-[var(--gradient-neon)] text-background border-transparent shadow-[var(--shadow-glow)]"
                : "glass border-white/5 text-muted-foreground"
            }`}
            title={b.label}
          >
            <Icon className="h-5 w-5" />
            <span className="absolute bottom-1 left-0 right-0 px-1 text-[9px] font-medium leading-tight truncate">
              {b.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}