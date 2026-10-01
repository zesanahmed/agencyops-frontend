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
 * Single-flight refresh: concurrent 401s share one /auth/refresh call, which
 * matters because the backend rotates the refresh token and treats a reused
 * token as theft (it revokes the session).
 */
let refreshInFlight: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await send("/auth/refresh", { method: "POST", anonymous: true }, null);
        if (!res.ok) return null;
        const body = (await readBody(res)) as SuccessEnvelope<{ accessToken?: string }> | undefined;
        const token = body?.data?.accessToken ?? null;
        useAuthStore.getState().setAccessToken(token);
        return token;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const store = useAuthStore.getState();
  let res = await send(path, opts, store.accessToken);

  if (res.status === 401 && !opts.anonymous) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      res = await send(path, opts, fresh);
    } else {
      useAuthStore.getState().clear();
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
