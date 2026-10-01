import type { NextConfig } from "next";

/**
 * The browser talks to `/api/v1/*` on the frontend origin; Next rewrites that
 * to the real backend. Why: the backend's refresh cookie is `SameSite=Strict`,
 * and a frontend on one *.vercel.app host calling an API on another is
 * cross-site, so the cookie would never be sent and session restore would
 * silently fail in production. Proxying keeps the cookie first-party without
 * weakening the backend's cookie policy.
 */
const BACKEND_ORIGIN = (process.env.BACKEND_ORIGIN ?? "http://localhost:5000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${BACKEND_ORIGIN}/api/v1/:path*` }];
  },
};

export default nextConfig;
