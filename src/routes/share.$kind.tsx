import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { APP_URL, miniAppMeta, shareImageUrl } from "@/lib/farcaster";

const KIND = ["score", "streak", "challenge"] as const;
type Kind = (typeof KIND)[number];

const search = z.object({
  xp: z.coerce.number().int().min(0).max(10_000_000).optional(),
  streak: z.coerce.number().int().min(0).max(10_000).optional(),
  ref: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
});

function copy(kind: Kind, s: { xp?: number; streak?: number; ref?: string }) {
  if (kind === "score") {
    const xp = (s.xp ?? 0).toLocaleString();
    return {
      title: `🎮 ${xp} XP on Resident Arcade`,
      description: `Scoring on Resident Arcade — a Base-native arcade for the Farcaster era. Think you can beat ${xp} XP?`,
      button: "🎮 Beat my score",
      launch: `${APP_URL}/app`,
    };
  }
  if (kind === "streak") {
    const streak = s.streak ?? 0;
    return {
      title: `🔥 ${streak}-day streak on Resident Arcade`,
      description: `${streak} days and counting. Daily spins, flips, and XP on Base. Catch up if you can.`,
      button: "🔥 Start my streak",
      launch: `${APP_URL}/app`,
    };
  }
  return {
    title: `🕹️ Challenge: join me on Resident Arcade`,
    description: `Hop on Resident Arcade with me. Play. Earn. Flex. Built on Base.`,
    button: "🎮 Accept challenge",
    launch: s.ref ? `${APP_URL}/auth?ref=${s.ref}` : `${APP_URL}/app`,
  };
}

export const Route = createFileRoute("/share/$kind")({
  validateSearch: search,
  loaderDeps: ({ search }) => search,
  beforeLoad: ({ params }) => {
    if (!KIND.includes(params.kind as Kind)) throw notFound();
  },
  loader: ({ params, deps }) => {
    const kind = params.kind as Kind;
    return { kind, search: deps, content: copy(kind, deps) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { kind, content } = loaderData;
    const image = shareImageUrl(kind);
    return {
      meta: [
        { title: `${content.title} — Resident Arcade` },
        { name: "description", content: content.description },
        { property: "og:title", content: content.title },
        { property: "og:description", content: content.description },
        { property: "og:image", content: image },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
        ...miniAppMeta({
          imageUrl: image,
          buttonTitle: content.button,
          launchUrl: content.launch,
        }),
      ],
    };
  },
  component: SharePage,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center text-center p-6">
      <div>
        <h1 className="text-2xl font-bold">Unknown share card</h1>
        <Link to="/" className="text-[var(--neon)] underline">Go home</Link>
      </div>
    </div>
  ),
});

function SharePage() {
  const { kind, content } = Route.useLoaderData();
  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6 text-center">
        <div className="glass overflow-hidden rounded-2xl">
          <img
            src={`/frames/${kind}.png`}
            alt={content.title}
            width={1200}
            height={800}
            className="w-full h-auto"
          />
        </div>
        <h1 className="text-3xl font-bold gradient-text">{content.title}</h1>
        <p className="text-muted-foreground">{content.description}</p>
        <Link
          to="/app"
          className="inline-flex rounded-full bg-[var(--gradient-neon)] text-background font-semibold px-6 py-3 shadow-[var(--shadow-glow)]"
        >
          {content.button}
        </Link>
      </div>
    </div>
  );
}