import type { NextConfig } from "next";

const apiUpstream =
  process.env.API_UPSTREAM_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  "https://core-xgfvw.ondigitalocean.app";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_USE_API_PROXY:
      process.env.NEXT_PUBLIC_USE_API_PROXY ??
      (process.env.VERCEL ? "true" : "false"),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUpstream.replace(/\/$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
