import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// Vercel (and any standard host) expects the default `.next` output directory.
// Keep the split dirs only for local development / local production builds.
const isHosted = process.env.VERCEL === "1" || process.env.VERCEL === "true";

const nextConfig = (phase: string): NextConfig => ({
  // Keep dev output separate from production builds; otherwise `next build`
  // can replace chunks while `next dev` is serving the same browser session.
  distDir:
    process.env.NEXT_DIST_DIR ||
    (isHosted
      ? ".next"
      : phase === PHASE_DEVELOPMENT_SERVER
        ? ".next-dev"
        : ".next-build"),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
    ],
  },
  poweredByHeader: false,
  experimental: {
    // The add-job form uploads a compressed screenshot through a Server Action.
    // 1 MB (the default) is too tight for a tall screenshot plus pasted text.
    serverActions: { bodySizeLimit: "4mb" },
    // Next.js defaults dynamic pages to 0s in the client Router Cache, so every
    // visit re-renders the page on the server. Keep visited pages reusable for
    // 2 minutes (5 for static ones) — back-and-forth navigation then needs no
    // new request. Mutations call revalidatePath(), which clears these entries
    // immediately, so this does not leave the UI stale after an edit.
    staleTimes: { dynamic: 120, static: 300 },
  },
});

export default nextConfig;
