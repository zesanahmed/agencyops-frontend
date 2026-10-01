/** Public, non-secret configuration. Secrets never belong here. */
export const env = {
  /** Same-origin by default; Next rewrites `/api/v1/*` to BACKEND_ORIGIN (see next.config.ts). */
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
