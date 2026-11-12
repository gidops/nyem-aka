import type { NextConfig } from "next";

// Where the NestJS API lives. Server-side only: the browser never sees this URL.
const API_URL = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The browser calls /api/* on this site and Next.js forwards it to the API.
  // Because the browser only ever talks to one origin, the auth cookies are
  // first-party: no CORS setup, and no third-party-cookie blocking between
  // the Vercel and Render domains.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;
