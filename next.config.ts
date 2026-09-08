import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dashboard listing and on-demand site renders read the committed configs
  // at request time, so they have to be traced into the deployed bundles.
  outputFileTracingIncludes: {
    "/api/sites": ["./data/sites/**/*"],
    "/[slug]": ["./data/sites/**/*"],
  },
};

export default nextConfig;
