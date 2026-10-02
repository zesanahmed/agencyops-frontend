import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { ApiError } from "./errors";
import { useAuthStore } from "@/stores/auth-store";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("apiRequest", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "old", status: "authenticated" });
  });
  afterEach(() => vi.restoreAllMocks());

  it("unwraps the { data } envelope and sends bearer + credentials", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(json(200, { data: { id: "1" } }));
    const result = await apiRequest<{ id: string }>("/auth/me");
    expect(result).toEqual({ id: "1" });
    const init = spy.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe("include");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer old");
  });

  it("refreshes once on 401 and retries with the new token", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json(401, { message: "expired" }))
      .mockResolvedValueOnce(json(200, { data: { accessToken: "new" } }))
      .mockResolvedValueOnce(json(200, { data: { ok: true } }));
    const result = await apiRequest<{ ok: boolean }>("/organizations");
    expect(result).toEqual({ ok: true });
    expect(spy).toHaveBeenCalledTimes(3);
    expect(useAuthStore.getState().accessToken).toBe("new");
  });

  it("shares a single refresh between concurrent 401s", async () => {
    let refreshCalls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        return json(200, { data: { accessToken: "new" } });
      }
      const auth = (init?.headers as Record<string, string>).Authorization;
      return auth === "Bearer new" ? json(200, { data: 1 }) : json(401, {});
    });
    await Promise.all([apiRequest("/a"), apiRequest("/b")]);
    expect(refreshCalls).toBe(1);
  });

  it("clears the session and throws when refresh fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(401, {}));
    await expect(apiRequest("/organizations")).rejects.toBeInstanceOf(ApiError);
    expect(useAuthStore.getState().status).toBe("anonymous");
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("keeps the session when the refresh endpoint is unreachable (network error)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).endsWith("/auth/refresh")) throw new TypeError("Failed to fetch");
      return json(401, {});
    });
    await expect(apiRequest("/organizations")).rejects.toBeInstanceOf(TypeError);
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("keeps the session when the refresh endpoint is down (5xx/429)", async () => {
    for (const status of [500, 503, 429]) {
      useAuthStore.setState({ accessToken: "old", status: "authenticated" });
      vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
        String(input).endsWith("/auth/refresh") ? json(status, {}) : json(401, {}));
      await expect(apiRequest("/organizations")).rejects.toBeInstanceOf(TypeError);
      expect(useAuthStore.getState().status).toBe("authenticated");
      vi.restoreAllMocks();
    }
  });

  it("never leaks 5xx server messages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(500, { message: "stack: secret" }));
    await expect(apiRequest("/x", { anonymous: true })).rejects.toThrow(/Something went wrong/);
  });
});
