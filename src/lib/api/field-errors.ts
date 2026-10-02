import { ApiError } from "./errors";

/**
 * Pulls per-field messages out of a backend validation error. The envelope is
 * unverified, so accept the common shapes:
 *   [{ path: "email" | ["email"], message }], [{ field, message }], { email: "msg" | ["msg"] }
 * Returns only fields the caller knows about, so unknown keys never leak into the UI.
 */
export function extractFieldErrors<K extends string>(error: unknown, known: readonly K[]): Partial<Record<K, string>> {
  if (!(error instanceof ApiError) || error.status !== 400 && error.status !== 422 && error.status !== 409) return {};
  const out: Partial<Record<K, string>> = {};
  const set = (key: unknown, msg: unknown) => {
    const k = Array.isArray(key) ? key[key.length - 1] : key;
    const m = Array.isArray(msg) ? msg[0] : msg;
    if (typeof k === "string" && typeof m === "string" && (known as readonly string[]).includes(k) && !out[k as K]) out[k as K] = m;
  };
  const d = error.details;
  if (Array.isArray(d)) {
    for (const item of d) if (typeof item === "object" && item !== null) {
      const r = item as Record<string, unknown>;
      set(r.path ?? r.field ?? r.param, r.message ?? r.msg);
    }
  } else if (typeof d === "object" && d !== null) {
    for (const [k, v] of Object.entries(d as Record<string, unknown>)) set(k, v);
  }
  return out;
}
