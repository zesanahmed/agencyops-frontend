import { env } from "@/config/env";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError, parseErrorBody } from "./errors";

type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
  /** Skip the Authorization header and the 401→refresh retry (auth endpoints). */
  anonymous?: boolean;
  /** Return the whole JSON body instead of unwrapping `{ data }`. */
  raw?: boolean;
}

/** The backend wraps successful payloads as `{ data: ... }` (see Postman tests). */
interface SuccessEnvelope<T> {
  data: T;
}

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return env.apiBaseUrl.replace(/\/$/, "") + path + (qs ? `?${qs}` : "");
}

async function readBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

async function send(path: string, opts: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (token && !opts.anonymous) headers.Authorization = `Bearer ${token}`;

  return fetch(buildUrl(path, opts.query), {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: "include", // sends/receives the HttpOnly refresh cookie
    signal: opts.signal,
  });
}

/**
 * Outcome of a refresh attempt. The distinction matters: only a definitive
 * rejection (the server says the session is invalid) may end the session.
 * A network error, an aborted request (page unloading), a 5xx or 429 is
 * transient — the refresh cookie may still be perfectly valid.
 */
export type RefreshOutcome =
  | { kind: "ok"; token: string }
  | { kind: "rejected" }
  | { kind: "unavailable" };

/**
 * Single-flight refresh: concurrent 401s share one /auth/refresh call, which
 * matters because the backend rotates the refresh token and treats a reused
 * token as theft (it revokes the session).
 */
let refreshInFlight: Promise<RefreshOutcome> | null = null;

export function refreshSession(): Promise<RefreshOutcome> {
  if (!refreshInFlight) {
    refreshInFlight = (async (): Promise<RefreshOutcome> => {
      try {
        const res = await send("/auth/refresh", { method: "POST", anonymous: true }, null);
        if (res.ok) {
          const body = (await readBody(res)) as SuccessEnvelope<{ accessToken?: string }> | undefined;
          const token = body?.data?.accessToken;
          // A 200 without a token is a contract problem, not a signed-out user: don't destroy the session over it.
          if (!token) return { kind: "unavailable" };
          useAuthStore.getState().setAccessToken(token);
          return { kind: "ok", token };
        }
        return res.status >= 500 || res.status === 429 || res.status === 408 ? { kind: "unavailable" } : { kind: "rejected" };
      } catch {
        return { kind: "unavailable" };
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

/** Convenience for callers that only need a token or nothing. */
export async function refreshAccessToken(): Promise<string | null> {
  const outcome = await refreshSession();
  return outcome.kind === "ok" ? outcome.token : null;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const store = useAuthStore.getState();
  let res = await send(path, opts, store.accessToken);

  if (res.status === 401 && !opts.anonymous) {
    const outcome = await refreshSession();
    if (outcome.kind === "ok") {
      res = await send(path, opts, outcome.token);
    } else if (outcome.kind === "rejected") {
      useAuthStore.getState().clear();
    } else {
      // Can't tell whether the session is valid. Surface a connectivity error; keep the session.
      throw new TypeError("Session refresh is unavailable");
    }
  }

  const body = await readBody(res);
  if (!res.ok) throw parseErrorBody(res.status, body);

  if (opts.raw) return body as T;

  // Unwrap `{ data }` when present; tolerate bare payloads until the envelope is verified.
  if (body && typeof body === "object" && "data" in body) {
    return (body as SuccessEnvelope<T>).data;
  }
  return body as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    apiRequest<T>(path, { method: "GET", query, signal }),
  post: <T>(path: string, body?: unknown, opts?: Pick<RequestOptions, "anonymous">) =>
    apiRequest<T>(path, { method: "POST", body, ...opts }),
  put: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body }),
  delete: <T = void>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};

export { ApiError };

/** GET that returns the full envelope body, for list endpoints that carry pagination meta. */
export async function apiGetRaw(path: string, query?: Record<string, string | number | boolean | null | undefined>, signal?: AbortSignal): Promise<unknown> {
  return apiRequest<unknown>(path, { method: "GET", query, signal, raw: true });
}
