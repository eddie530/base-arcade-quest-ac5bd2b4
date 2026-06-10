import { createFileRoute } from "@tanstack/react-router";
import { APP_URL } from "@/lib/farcaster";

// Farcaster Mini App manifest. Served at /.well-known/farcaster.json
// via the route alias below.
export const Route = createFileRoute("/api/.well-known/farcaster.json")({
  server: {
    handlers: {
      GET: async () => {
        const body = {
          // accountAssociation is added once the project is claimed in Warpcast;
          // omitting it still lets the embed render with a "by unknown" badge.
          frame: {
            version: "1",
            name: "Resident Arcade",
            iconUrl: `${APP_URL}/frames/icon.png`,
            homeUrl: `${APP_URL}/app`,
            splashImageUrl: `${APP_URL}/frames/icon.png`,
            splashBackgroundColor: "#0a0e1a",
            subtitle: "Play. Earn. Flex.",
            description:
              "A Base-native arcade for the Farcaster era. Spin, flip, streak, climb.",
            primaryCategory: "games",
            tags: ["base", "arcade", "games", "xp", "streak"],
            heroImageUrl: `${APP_URL}/frames/score.png`,
            ogTitle: "Resident Arcade",
            ogDescription: "Play. Earn. Flex. Built on Base.",
            ogImageUrl: `${APP_URL}/frames/score.png`,
          },
        };
        return new Response(JSON.stringify(body, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});