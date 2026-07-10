import type { NextConfig } from "next";

const apiUpstream =
  process.env.API_UPSTREAM_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  "https://core-xgfvw.ondigitalocean.app";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  transpilePackages: ["@aeg/annual-inspection-mqtt"],
  env: {
    NEXT_PUBLIC_USE_API_PROXY:
      process.env.NEXT_PUBLIC_USE_API_PROXY ??
      (process.env.VERCEL ? "true" : "false"),
  },
  async rewrites() {
    const upstream = apiUpstream.replace(/\/$/, "");
    // fallback: proxy al backend Java solo si Next no tiene Route Handler (/api/uploads/*).
    return {
      fallback: [
        {
          source: "/api/:path*",
          destination: `${upstream}/api/:path*`,
        },
      ],
    };
  },
  async redirects() {
    return [
      { source: "/mqtt-tests", destination: "/remoto", permanent: true },
      {
        source: "/docs/enajenacion-mqtt",
        destination: "/docs/enajenacion-remoto",
        permanent: true,
      },
      {
        source: "/docs/annual-inspection-mqtt",
        destination: "/docs/annual-inspection-remoto",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
