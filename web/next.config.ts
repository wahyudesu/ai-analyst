import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Configured for pnpm monorepo - single lockfile at root */
  experimental: {
    turbopack: {
      root: __dirname,
    },
  },
};

export default nextConfig;
