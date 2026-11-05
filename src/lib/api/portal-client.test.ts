import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth-store";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import { portalAuthApi, portalProjectsApi } from "./services";
import { portalApi } from "./portal-client";
import { apiRequest } from "./client";

const ok = (data: unknown, status = 200) => new Response(JSON.stringify({ success: true, data }), { status, headers: { "content-type": "application/json" } });
const call = (spy: ReturnType<typeof vi.spyOn>, i = 0) => ({ url: new URL(String(spy.mock.calls[i][0]), "http://x"), init: spy.mock.calls[i][1] as RequestInit });
const auth = (init: RequestInit) => new Headers(init.headers).get("Authorization");
const pagination = { page: 1, limit: 20, total: 1, totalPages: 1 };

beforeEach(() => {
  useAuthStore.setState({ accessToken: "STAFF", status: "authenticated" });
  usePortalAuthStore.setState({ accessToken: "PORTAL", status: "authenticated", contact: null });
});
afterEach(() => vi.restoreAllMocks());

describe("two realms, two sessions", () => {
  it("portal calls carry the portal token, staff calls the staff token, never crossed", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok({ projects: [], organizations: [] }));
    await portalProjectsApi.list();
    await apiRequest("/organizations");
    expect(call(spy, 0).url.pathname).toBe("/api/v1/portal/projects");
    expect(auth(call(spy, 0).init)).toBe("Bearer PORTAL");
    expect(auth(call(spy, 1).init)).toBe("Bearer STAFF");
  });

  it("a portal 401 refreshes through /portal/auth/refresh and updates only the portal token", async () => {
    const spy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(ok({ accessToken: "PORTAL2" }))
      .mockResolvedValueOnce(ok({ projects: [] }));
    await portalProjectsApi.list();
    expect(call(spy, 1).url.pathname).toBe("/api/v1/portal/auth/refresh");
    expect(auth(call(spy, 2).init)).toBe("Bearer PORTAL2");
    expect(usePortalAuthStore.getState().accessToken).toBe("PORTAL2");
    expect(useAuthStore.getState().accessToken).toBe("STAFF"); // the staff session is untouched
  });

  it("a rejected portal refresh ends only the portal session", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("{}", { status: 401 })).mockResolvedValueOnce(new Response("{}", { status: 401 })).mockResolvedValueOnce(new Response(JSON.stringify({ message: "x" }), { status: 401 }));
    await expect(portalApi.get("/portal/projects")).rejects.toMatchObject({ status: 401 });
    expect(usePortalAuthStore.getState().status).toBe("anonymous");
    expect(useAuthStore.getState().status).toBe("authenticated");
  });
});

describe("portal API contract (portal.routes.ts / portal.auth.controller.ts at 08f0b20)", () => {
  const contact = { id: "k1", name: "Dana Reyes", email: "client@demo.agencyops.test", jobTitle: "Product lead", clientOrganizationName: "Northwind", organizationName: "Brightline Studio" };

  it("login and accept-invite are anonymous POSTs returning { accessToken, contact }", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok({ accessToken: "tok", contact }, 201));
    const a = await portalAuthApi.login({ organizationSlug: "brightline-studio", email: "client@demo.agencyops.test", password: "x" });
    const b = await portalAuthApi.acceptInvite({ token: "t".repeat(20), password: "new-password-1" });
    expect(a).toEqual({ accessToken: "tok", contact });
    expect(b.contact?.clientOrganizationName).toBe("Northwind");
    expect([call(spy, 0).url.pathname, call(spy, 1).url.pathname]).toEqual(["/api/v1/portal/auth/login", "/api/v1/portal/auth/accept-invite"]);
    expect(JSON.parse(call(spy, 0).init.body as string)).toEqual({ organizationSlug: "brightline-studio", email: "client@demo.agencyops.test", password: "x" });
    expect(auth(call(spy, 0).init)).toBeNull();
  });
  it("a sign-in response without an access token is an error, not a silent success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ contact }));
    await expect(portalAuthApi.login({ organizationSlug: "a", email: "a@b.co", password: "x" })).rejects.toThrow();
  });
  it("me, logout and logout-all hit the portal paths", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok({ contact }));
    expect((await portalAuthApi.me()).name).toBe("Dana Reyes");
    await portalAuthApi.logout(); await portalAuthApi.logoutAll();
    expect([1, 2].map((i) => call(spy, i).url.pathname)).toEqual(["/api/v1/portal/auth/logout", "/api/v1/portal/auth/logout-all"]);
  });
  it("projects carry progress; tasks and updates are paged and expose no internal fields", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(ok({ projects: [{ id: "p1", name: "Website", description: null, status: "ACTIVE", startDate: null, dueDate: "2026-12-01T00:00:00Z", progress: { totalTasks: 10, completedTasks: 4, percentComplete: 40, byStatus: { DONE: 4, TODO: 6, WEIRD: 1 } } }] }))
      .mockResolvedValueOnce(ok({ tasks: [{ id: "t1", title: "Build", description: null, status: "IN_PROGRESS", priority: "HIGH", startDate: null, dueDate: null }], pagination }))
      .mockResolvedValueOnce(ok({ updates: [{ id: "u1", title: "T", body: "B", createdAt: "", author: { name: "Arif" } }], pagination }));
    const [p] = await portalProjectsApi.list();
    expect(p.progress).toEqual({ totalTasks: 10, completedTasks: 4, percentComplete: 40, byStatus: { DONE: 4, TODO: 6 } }); // unknown statuses dropped
    const tasks = await portalProjectsApi.tasks("p1", { status: "IN_PROGRESS" });
    expect(Object.keys(tasks.items[0]).sort()).toEqual(["description", "dueDate", "id", "priority", "startDate", "status", "title"]);
    expect((await portalProjectsApi.updates("p1")).items[0].author.name).toBe("Arif");
  });
});
