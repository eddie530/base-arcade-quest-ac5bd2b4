export const APP_URL = "https://base-arcade-quest.lovable.app";

type ShareKind = "score" | "streak" | "challenge";

export function shareImageUrl(kind: ShareKind) {
  return `${APP_URL}/frames/${kind}.png`;
}

export function miniAppEmbed(opts: { imageUrl: string; buttonTitle?: string; launchUrl?: string }) {
  return {
    version: "1",
    imageUrl: opts.imageUrl,
    button: {
      title: opts.buttonTitle ?? "🎮 Play Now",
      action: {
        type: "launch_miniapp",
        url: opts.launchUrl ?? `${APP_URL}/app`,
        name: "Resident Arcade",
        splashImageUrl: `${APP_URL}/frames/icon.png`,
        splashBackgroundColor: "#0a0e1a",
      },
    },
  };
}

/** Build the fc:miniapp + legacy fc:frame meta entries for a route head(). */
export function miniAppMeta(opts: { imageUrl: string; buttonTitle?: string; launchUrl?: string }) {
  const json = JSON.stringify(miniAppEmbed(opts));
  return [
    { name: "fc:miniapp", content: json },
    // Backwards compat with clients still reading the v1 frame tag
    { name: "fc:frame", content: json },
  ];
}

export function warpcastCompose(text: string, embeds: string[] = []) {
  const params = new URLSearchParams();
  params.set("text", text);
  for (const e of embeds) params.append("embeds[]", e);
  return `https://warpcast.com/~/compose?${params.toString()}`;
}

export function shareUrl(
  kind: ShareKind,
  params: { xp?: number; streak?: number; ref?: string } = {},
) {
  const sp = new URLSearchParams();
  if (params.xp != null) sp.set("xp", String(params.xp));
  if (params.streak != null) sp.set("streak", String(params.streak));
  if (params.ref) sp.set("ref", params.ref);
  const qs = sp.toString();
  return `${APP_URL}/share/${kind}${qs ? `?${qs}` : ""}`;
}
