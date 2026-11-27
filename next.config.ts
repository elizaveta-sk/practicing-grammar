import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Dev only: let phones on the home Wi-Fi load the dev server's scripts
  // (otherwise they get an empty page). No effect on the deployed site.
  allowedDevOrigins: ["192.168.*.*"],
  partialPrefetching: true,
  turbopack: {
    // A stray package-lock.json in the home folder confuses root detection.
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
