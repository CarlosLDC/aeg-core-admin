import type { NextConfig } from "next";

const defaultApiUrl =
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  "https://core-xgfvw.ondigitalocean.app";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: defaultApiUrl,
  },
};

export default nextConfig;
