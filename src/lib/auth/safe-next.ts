/**
 * Post-auth redirect target from `?next=`. Only same-origin relative paths are
 * allowed; protocol-relative (`//evil.com`), backslash and absolute URLs fall back.
 */
export function safeNext(next: string | null | undefined, fallback = "/organizations"): string {
  if (!next || !next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback; // control characters / header-splitting attempts
  return next;
}
