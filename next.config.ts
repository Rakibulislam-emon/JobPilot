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
});

export default nextConfig;
