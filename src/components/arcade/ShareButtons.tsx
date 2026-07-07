import { toast } from "sonner";
import { Share2, Users, Flame } from "lucide-react";
import { shareUrl, warpcastCompose } from "@/lib/farcaster";

export function ShareButtons({
  xp,
  streak,
  referralCode,
  brand = "Resident Arcade",
}: {
  xp: number;
  streak: number;
  referralCode?: string | null;
  brand?: string;
}) {
  const scoreEmbed = shareUrl("score", { xp, streak });
  const streakEmbed = shareUrl("streak", { streak, xp });
  const challengeEmbed = shareUrl("challenge", {
    ref: referralCode ?? undefined,
  });

  const scoreText = `🎮 ${xp.toLocaleString()} XP on ${brand}. Play. Earn. Flex.`;
  const streakText = `🔥 ${streak}-day streak on ${brand}. Can you beat me?`;
  const challengeText = `Just hopped on ${brand} — join me on Base.${
    referralCode ? ` Use code ${referralCode}.` : ""
  }`;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  const items = [
    { label: "Share Score", text: scoreText, embed: scoreEmbed, Icon: Share2 },
    { label: "Share Streak", text: streakText, embed: streakEmbed, Icon: Flame },
    { label: "Challenge Friends", text: challengeText, embed: challengeEmbed, Icon: Users },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(({ label, text, embed, Icon }) => (
        <a
          key={label}
          href={warpcastCompose(text, [embed])}
          target="_blank"
          rel="noreferrer"
          onContextMenu={(e) => {
            e.preventDefault();
            copy(`${text} ${embed}`);
          }}
          className="glass hover:bg-white/10 rounded-xl p-3 text-center text-xs font-medium transition"
        >
          <Icon className="mx-auto mb-1 h-4 w-4 text-[var(--neon)]" />
          {label}
        </a>
      ))}
    </div>
  );
}
