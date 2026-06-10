import { toast } from "sonner";
import { Share2, Users, Flame } from "lucide-react";

function farcasterCompose(text: string) {
  return `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`;
}

export function ShareButtons({
  xp,
  streak,
  referralCode,
}: {
  xp: number;
  streak: number;
  referralCode?: string | null;
}) {
  const url = typeof window !== "undefined" ? window.location.origin : "";
  const refLink = referralCode ? `${url}/auth?ref=${referralCode}` : url;
  const scoreText = `🎮 ${xp.toLocaleString()} XP on Resident Arcade.\nPlay. Earn. Flex. ${url}`;
  const streakText = `🔥 I'm on a ${streak}-day streak on Resident Arcade.\nCan you beat me? ${url}`;
  const challengeText = `Just hopped on Resident Arcade — join me on Base.\n${refLink}`;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  const items = [
    { label: "Share Score", text: scoreText, Icon: Share2 },
    { label: "Share Streak", text: streakText, Icon: Flame },
    { label: "Challenge Friends", text: challengeText, Icon: Users },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(({ label, text, Icon }) => (
        <a
          key={label}
          href={farcasterCompose(text)}
          target="_blank"
          rel="noreferrer"
          onContextMenu={(e) => {
            e.preventDefault();
            copy(text);
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