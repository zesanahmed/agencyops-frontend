/**
 * A NON-SENSITIVE "a session probably exists" hint cookie. It carries no token
 * and grants nothing; it only lets src/proxy.ts redirect unauthenticated
 * visitors before the page renders. The real gate is the backend (401) plus
 * <AuthGate/>, which restores the session via the HttpOnly refresh cookie.
 */
export const SESSION_FLAG = "ao_session";

export function setSessionFlag(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_FLAG}=1; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Strict${location.protocol === "https:" ? "; Secure" : ""}`;
}

export function clearSessionFlag(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_FLAG}=; Path=/; Max-Age=0; SameSite=Strict`;
}

export function hasSessionFlag(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c === `${SESSION_FLAG}=1`);
}

/**
 * The same non-sensitive hint for the client portal, in its own cookie: a staff session says nothing about a portal
 * session and vice versa (they are separate security boundaries).
 */
export const PORTAL_SESSION_FLAG = "ao_portal_session";

export function setPortalSessionFlag(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${PORTAL_SESSION_FLAG}=1; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Strict${location.protocol === "https:" ? "; Secure" : ""}`;
}
export function clearPortalSessionFlag(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${PORTAL_SESSION_FLAG}=; Path=/; Max-Age=0; SameSite=Strict`;
}
export function hasPortalSessionFlag(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c === `${PORTAL_SESSION_FLAG}=1`);
}
