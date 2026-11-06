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

describe("portal L2 contract (collaboration + invoices)", () => {
  const meta = { page: 1, limit: 20, total: 1, totalPages: 1 };
  it("messages, requests and files are project-scoped under /portal/projects/:id", async () => {
    const spy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(ok({ messages: [{ id: "m1", content: "hi", createdAt: "", author: { type: "STAFF", name: "A" } }], pagination: meta }))
      .mockResolvedValueOnce(ok({ message: { id: "m2", content: "yo", createdAt: "", author: { type: "CLIENT", name: "Dana" } } }, 201))
      .mockResolvedValueOnce(ok({ requests: [{ id: "r1", projectId: "p1", type: "ISSUE", title: "T", description: "D", status: "IN_REVIEW", resolutionNote: "On it", createdAt: "", updatedAt: "", resolvedAt: null }], pagination: meta }))
      .mockResolvedValueOnce(ok({ request: { id: "r2", projectId: "p1", type: "QUESTION", title: "T", description: "D", status: "OPEN", resolutionNote: null, createdAt: "", updatedAt: "", resolvedAt: null } }, 201))
      .mockResolvedValueOnce(ok({ files: [{ id: "f1", originalFilename: "a.pdf", url: "https://x/a.pdf", mimeType: "application/pdf", sizeBytes: 9, createdAt: "", uploadedBy: { type: "STAFF", name: "A" } }], pagination: meta }));
    expect((await portalProjectsApi.messages("p1")).items[0].author.type).toBe("STAFF");
    expect((await portalProjectsApi.postMessage("p1", "yo")).author.type).toBe("CLIENT");
    const reqs = await portalProjectsApi.requests("p1");
    expect(reqs.items[0]).toMatchObject({ status: "IN_REVIEW", resolutionNote: "On it" });
    expect("contact" in reqs.items[0]).toBe(false); // a contact never sees who else asked
    await portalProjectsApi.createRequest("p1", { type: "QUESTION", title: "T", description: "D" });
    expect(JSON.parse(call(spy, 3).init.body as string)).toEqual({ type: "QUESTION", title: "T", description: "D" });
    expect((await portalProjectsApi.files("p1")).items[0].uploadedBy.type).toBe("STAFF");
    expect([0, 1, 2, 3, 4].map((i) => call(spy, i).url.pathname.replace("/api/v1/portal/projects/p1/", ""))).toEqual(["messages", "messages", "requests", "requests", "files"]);
  });
  it("invoices: list, get (flat invoice), checkout URL and payment status with `session_id`", async () => {
    const invoice = { id: "i1", number: "INV-0001", status: "OPEN", projectId: null, issueDate: "", dueDate: "", currency: "usd", subtotalCents: 100, taxCents: 0, discountCents: 0, totalCents: 100, notes: null, sentAt: null, paidAt: null, pdfUrl: null, items: [] };
    const spy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(ok({ invoices: [invoice], pagination: meta }))
      .mockResolvedValueOnce(ok(invoice))
      .mockResolvedValueOnce(ok({ url: "https://checkout.stripe.com/c/pay/cs_1" }, 201))
      .mockResolvedValueOnce(ok({ invoiceStatus: "OPEN", confirmed: false, payment: { status: "FAILED", failureReason: "Card declined", paidAt: null } }))
      .mockResolvedValueOnce(ok({ invoiceStatus: "PAID", confirmed: true, payment: null }));
    const { portalInvoicesApi } = await import("./services");
    expect((await portalInvoicesApi.list({ page: 2 })).items[0].number).toBe("INV-0001");
    expect((await portalInvoicesApi.get("i1")).totalCents).toBe(100);
    expect(await portalInvoicesApi.checkout("i1")).toBe("https://checkout.stripe.com/c/pay/cs_1");
    const failed = await portalInvoicesApi.paymentStatus("i1", "cs_1");
    expect(failed).toEqual({ invoiceStatus: "OPEN", confirmed: false, payment: { status: "FAILED", failureReason: "Card declined", paidAt: null } });
    expect(call(spy, 3).url.searchParams.get("session_id")).toBe("cs_1");
    expect(call(spy, 3).url.searchParams.has("sessionId")).toBe(false);
    expect(await portalInvoicesApi.paymentStatus("i1")).toMatchObject({ confirmed: true, payment: null });
    expect(call(spy, 4).url.searchParams.has("session_id")).toBe(false);
  });
});
