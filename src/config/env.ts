/** Public, non-secret configuration. Secrets never belong here. */
export const env = {
  /** Same-origin by default; Next rewrites `/api/v1/*` to BACKEND_ORIGIN (see next.config.ts). */
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/v1",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /**
   * Sign-in providers to show (comma separated, subset of google,github). Empty hides the buttons. Only enable a
   * provider once the backend has its OAuth credentials, otherwise its endpoint answers with an error page.
   */
  oauthProviders: (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "").split(",").map((p) => p.trim().toLowerCase()).filter((p): p is "google" | "github" => p === "google" || p === "github"),
} as const;
