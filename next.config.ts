import type { NextConfig } from "next";

const fiscalBooksAppUrl = "https://aeg-libros-fiscales.vercel.app";

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
  async redirects() {
    return [
      {
        source: "/fiscal-book",
        destination: fiscalBooksAppUrl,
        permanent: false,
      },
      {
        source: "/fiscal-book/:path*",
        destination: `${fiscalBooksAppUrl}/fiscal-book/:path*`,
        permanent: false,
      },
    ];
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
};

export default nextConfig;
