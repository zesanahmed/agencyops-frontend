import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth-store";
import { apiUpload } from "./client";
import { ApiError } from "./errors";

/** Minimal XMLHttpRequest double: the test drives progress/response by hand. */
class FakeXhr {
  static instances: FakeXhr[] = [];
  method = ""; url = ""; headers: Record<string, string> = {}; withCredentials = false; body: unknown;
  status = 0; responseText = ""; aborted = false;
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null; onerror: (() => void) | null = null; onabort: (() => void) | null = null;
  constructor() { FakeXhr.instances.push(this); }
  open(m: string, u: string) { this.method = m; this.url = u; }
  setRequestHeader(k: string, v: string) { this.headers[k] = v; }
  send(b: unknown) { this.body = b; }
  abort() { this.aborted = true; this.onabort?.(); }
  respond(status: number, json: unknown) { this.status = status; this.responseText = JSON.stringify(json); this.onload?.(); }
}
const file = () => new File(["hello"], "note.txt", { type: "text/plain" });
const last = () => FakeXhr.instances[FakeXhr.instances.length - 1];

describe("apiUpload", () => {
  beforeEach(() => { FakeXhr.instances = []; vi.stubGlobal("XMLHttpRequest", FakeXhr); useAuthStore.setState({ accessToken: "tok", status: "authenticated" }); });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("posts multipart form data in the `file` field with the bearer token and cookies", async () => {
    const p = apiUpload<{ x: number }>("/organizations/o1/projects/p1/tasks/t1/attachments", file());
    const x = last();
    expect([x.method, x.withCredentials, x.headers.Authorization]).toEqual(["POST", true, "Bearer tok"]);
    expect(x.headers["Content-Type"]).toBeUndefined(); // the browser must add the multipart boundary
    expect((x.body as FormData).get("file")).toBeInstanceOf(File);
    x.respond(201, { success: true, data: { x: 1 } });
    await expect(p).resolves.toEqual({ x: 1 }); // unwraps { data }
  });

  it("reports progress as a 0..1 fraction", async () => {
    const seen: number[] = [];
    const p = apiUpload("/u", file(), { onProgress: (f) => seen.push(f) });
    last().upload.onprogress?.({ lengthComputable: true, loaded: 25, total: 100 });
    last().upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 });
    last().upload.onprogress?.({ lengthComputable: false, loaded: 5, total: 0 }); // ignored
    last().respond(201, { data: {} });
    await p;
    expect(seen).toEqual([0.25, 1]);
  });

  it("turns an error response into an ApiError carrying the server's message and field errors", async () => {
    const p = apiUpload("/u", file());
    last().respond(400, { success: false, message: "File content does not match its declared type" });
    await expect(p).rejects.toMatchObject({ status: 400, message: "File content does not match its declared type" });
    await expect(p).rejects.toBeInstanceOf(ApiError);
  });

  it("cancelling rejects with AbortError", async () => {
    const c = new AbortController();
    const p = apiUpload("/u", file(), { signal: c.signal });
    c.abort();
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
    expect(last().aborted).toBe(true);
    await expect(apiUpload("/u", file(), { signal: c.signal })).rejects.toMatchObject({ name: "AbortError" }); // already aborted: no request
  });

  it("a network failure is a TypeError (the UI treats it as connectivity)", async () => {
    const p = apiUpload("/u", file());
    last().onerror?.();
    await expect(p).rejects.toBeInstanceOf(TypeError);
  });

  it("refreshes the token once on a 401 and retries the upload with it", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ data: { accessToken: "fresh" } }), { status: 200 }));
    const p = apiUpload<{ ok: boolean }>("/u", file());
    last().respond(401, { message: "expired" });
    await vi.waitFor(() => expect(FakeXhr.instances).toHaveLength(2));
    expect(last().headers.Authorization).toBe("Bearer fresh");
    last().respond(201, { data: { ok: true } });
    await expect(p).resolves.toEqual({ ok: true });
  });

  it("a rejected refresh ends the session instead of retrying", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("{}", { status: 401 }));
    const p = apiUpload("/u", file());
    last().respond(401, { message: "expired" });
    await expect(p).rejects.toMatchObject({ status: 401 });
    expect(FakeXhr.instances).toHaveLength(1);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
