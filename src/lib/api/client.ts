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

export interface UploadOptions {
  /** 0..1, from the browser's upload progress events. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/**
 * One authentication realm. The internal API and the client portal are separate security boundaries with their own tokens,
 * refresh cookies and stores, so each gets its own transport; nothing is shared between them.
 */
export interface Realm {
  getToken: () => string | null;
  setToken: (token: string) => void;
  /** The server definitively rejected the session: drop it. */
  onRejected: () => void;
  /** Path of this realm's refresh endpoint, e.g. "/auth/refresh" or "/portal/auth/refresh". */
  refreshPath: string;
}

export function createTransport(realm: Realm) {
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
   * Single-flight refresh: concurrent 401s share one refresh call, which matters because the backend rotates the refresh
   * token and treats a reused token as theft (it revokes the session).
   */
  let refreshInFlight: Promise<RefreshOutcome> | null = null;
  function refresh(): Promise<RefreshOutcome> {
    if (!refreshInFlight) {
      refreshInFlight = (async (): Promise<RefreshOutcome> => {
        try {
          const res = await send(realm.refreshPath, { method: "POST", anonymous: true }, null);
          if (res.ok) {
            const body = (await readBody(res)) as SuccessEnvelope<{ accessToken?: string }> | undefined;
            const token = body?.data?.accessToken;
            // A 200 without a token is a contract problem, not a signed-out user: don't destroy the session over it.
            if (!token) return { kind: "unavailable" };
            realm.setToken(token);
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

  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    let res = await send(path, opts, realm.getToken());

    if (res.status === 401 && !opts.anonymous) {
      const outcome = await refresh();
      if (outcome.kind === "ok") {
        res = await send(path, opts, outcome.token);
      } else if (outcome.kind === "rejected") {
        realm.onRejected();
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

  /**
   * Multipart upload of one file (form field `file`, as the backend expects) with real upload progress, which `fetch` can't
   * report, hence XMLHttpRequest. Same auth behaviour as `request`: bearer token, and one refresh + retry on a 401.
   * Cancelling rejects with a DOMException named "AbortError".
   */
  async function upload<T>(path: string, file: File, opts: UploadOptions = {}): Promise<T> {
    const attempt = (token: string | null) =>
      new Promise<{ status: number; body: unknown }>((resolve, reject) => {
        if (opts.signal?.aborted) return reject(new DOMException("Upload cancelled", "AbortError"));
        const xhr = new XMLHttpRequest();
        xhr.open("POST", buildUrl(path));
        xhr.withCredentials = true;
        xhr.setRequestHeader("Accept", "application/json");
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable && e.total > 0) opts.onProgress?.(Math.min(1, e.loaded / e.total)); };
        xhr.onload = () => {
          let body: unknown;
          try { body = xhr.responseText ? (JSON.parse(xhr.responseText) as unknown) : undefined; } catch { body = undefined; }
          resolve({ status: xhr.status, body });
        };
        xhr.onerror = () => reject(new TypeError("Network error while uploading"));
        xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
        opts.signal?.addEventListener("abort", () => xhr.abort(), { once: true });
        const form = new FormData();
        form.append("file", file); // no Content-Type header: the browser adds the multipart boundary
        xhr.send(form);
      });

    let res = await attempt(realm.getToken());
    if (res.status === 401) {
      const outcome = await refresh();
      if (outcome.kind === "ok") res = await attempt(outcome.token);
      else if (outcome.kind === "rejected") realm.onRejected();
      else throw new TypeError("Session refresh is unavailable");
    }
    if (res.status < 200 || res.status >= 300) throw parseErrorBody(res.status, res.body);
    const body = res.body;
    return (body && typeof body === "object" && "data" in body ? (body as SuccessEnvelope<T>).data : body) as T;
  }

  const api = {
    get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>(path, { method: "GET", query, signal }),
    post: <T>(path: string, body?: unknown, opts?: Pick<RequestOptions, "anonymous">) => request<T>(path, { method: "POST", body, ...opts }),
    put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
    patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
    delete: <T = void>(path: string, body?: unknown) => request<T>(path, { method: "DELETE", body }),
  };
  /** GET that returns the full envelope body, for list endpoints that carry pagination meta. */
  const getRaw = (path: string, query?: Query, signal?: AbortSignal): Promise<unknown> => request<unknown>(path, { method: "GET", query, signal, raw: true });

  return { request, refresh, upload, api, getRaw };
}

// ---- The internal (staff) realm: the one the rest of the app has always used. ----
const internal = createTransport({
  getToken: () => useAuthStore.getState().accessToken,
  setToken: (t) => useAuthStore.getState().setAccessToken(t),
  onRejected: () => useAuthStore.getState().clear(),
  refreshPath: "/auth/refresh",
});

export const apiRequest = internal.request;
export const refreshSession = internal.refresh;
export const apiUpload = internal.upload;
export const api = internal.api;
export const apiGetRaw = internal.getRaw;
export { ApiError };

/** Convenience for callers that only need a token or nothing. */
export async function refreshAccessToken(): Promise<string | null> {
  const outcome = await refreshSession();
  return outcome.kind === "ok" ? outcome.token : null;
}
