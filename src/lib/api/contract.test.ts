import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityApi, attachmentApi, authApi, billingApi, clientApi, collabApi, commentApi, invoiceApi, invitationApi, memberApi, notificationApi, orgApi, projectApi, sprintApi, taskApi, teamApi } from "./services";
import { invitationStatus } from "@/types/domain";
import { useAuthStore } from "@/stores/auth-store";

/**
 * CONTRACT TESTS. Fixtures reproduce the backend's real wire format
 * (zesanahmed/agencyops-api, verified at afe5f62): { success, message, data }
 * with named keys (data.organizations, data.member, ...) and data.pagination.
 * If the backend changes a shape, these fail first.
 */
const ok = (data: unknown, status = 200) => new Response(JSON.stringify({ success: true, message: "ok", data }), { status, headers: { "Content-Type": "application/json" } });
const pagination = { page: 1, limit: 20, total: 2, totalPages: 1 };

describe("service layer ↔ backend contract", () => {
  beforeEach(() => useAuthStore.setState({ accessToken: "t", status: "authenticated" }));
  afterEach(() => vi.restoreAllMocks());

  it("auth: login/register return { accessToken, user }; me returns { user }", async () => {
    const user = { id: "u1", name: "Ada", email: "ada@x.io", avatarUrl: null };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ accessToken: "acc", user })).mockResolvedValueOnce(ok({ user }));
    expect(await authApi.login({ email: "ada@x.io", password: "pw" })).toEqual({ accessToken: "acc", user });
    expect(await authApi.me()).toEqual(user);
  });

  it("organizations: list under data.organizations; items carry NO role", async () => {
    const o = { id: "o1", name: "Acme", slug: "acme", logoUrl: null, ownerId: "u1", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z" };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ organizations: [o], pagination }));
    const r = await orgApi.list();
    expect(r.items).toEqual([o]);
    expect("role" in r.items[0]).toBe(false);
    expect(r.meta).toEqual(pagination);
  });

  it("organizations: get/create/update unwrap data.organization", async () => {
    const o = { id: "o1", name: "Acme", slug: "acme", ownerId: "u1", status: "ACTIVE" };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ organization: o })).mockResolvedValueOnce(ok({ organization: o, membership: { id: "m1" } }, 201)).mockResolvedValueOnce(ok({ organization: { ...o, name: "New" } }));
    expect((await orgApi.get("o1")).name).toBe("Acme");
    expect((await orgApi.create("Acme")).id).toBe("o1");
    expect((await orgApi.update("o1", { name: "New" })).name).toBe("New");
  });

  it("members: flattens the nested user and keeps the real membership id and role", async () => {
    const m = { id: "m1", userId: "u1", organizationId: "o1", role: "MANAGER", status: "ACTIVE", joinedAt: "2026-01-02T00:00:00Z", user: { id: "u1", name: "Bob", email: "bob@x.io", avatarUrl: null } };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ members: [m], pagination }));
    const [mem] = (await memberApi.list("o1")).items;
    expect(mem).toMatchObject({ id: "m1", userId: "u1", role: "MANAGER", name: "Bob", email: "bob@x.io" });
  });

  it("members: updateRole sends { role } and unwraps data.member", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ member: { id: "m1", userId: "u1", role: "TEAM_MEMBER", user: { name: "Bob", email: "b@x.io" } } }));
    const m = await memberApi.updateRole("o1", "m1", "TEAM_MEMBER");
    expect(m.role).toBe("TEAM_MEMBER");
    expect(JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)).toEqual({ role: "TEAM_MEMBER" });
  });

  it("invitations: create returns the token beside (not inside) the invitation", async () => {
    const inv = { id: "i1", email: "new@x.io", role: "TEAM_MEMBER", invitedByMembershipId: "m1", expiresAt: "2099-01-01T00:00:00Z", acceptedAt: null, revokedAt: null, createdAt: "2026-01-01T00:00:00Z" };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ invitation: inv, inviteToken: "tok-123" }, 201));
    const r = await invitationApi.create("o1", { email: "new@x.io", role: "TEAM_MEMBER" });
    expect(r.inviteToken).toBe("tok-123");
    expect(r.invitation.id).toBe("i1");
  });

  it("invitations: preview unwraps data.invitation { organizationName, email, role, expiresAt }", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ invitation: { organizationName: "Acme", email: "new@x.io", role: "MANAGER", expiresAt: "2099-01-01T00:00:00Z" } }));
    expect(await invitationApi.preview("tok")).toEqual({ organizationName: "Acme", email: "new@x.io", role: "MANAGER", expiresAt: "2099-01-01T00:00:00Z" });
  });

  it("projects/tasks: lists use data.projects / data.tasks; tasks carry only assigneeMembershipId", async () => {
    const t = { id: "t1", projectId: "p1", sprintId: null, parentTaskId: null, assigneeMembershipId: "m9", title: "Ship", description: null, status: "IN_REVIEW", priority: "HIGH", startDate: null, dueDate: null, createdAt: "2026-01-01T00:00:00Z" };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ projects: [{ id: "p1", name: "Site", slug: "site", status: "CANCELLED", description: null }], pagination })).mockResolvedValueOnce(ok({ tasks: [t], pagination }));
    expect((await projectApi.list("o1")).items[0].status).toBe("CANCELLED");
    const [task] = (await taskApi.list("o1", "p1", { assigneeMembershipId: "m9" })).items;
    expect(task).toMatchObject({ assigneeMembershipId: "m9", status: "IN_REVIEW" });
    expect("assignee" in task || "assigneeName" in task).toBe(false);
  });

  it("tasks: forwards the server-side assigneeMembershipId filter and page size", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ tasks: [], pagination }));
    await taskApi.list("o1", "p1", { assigneeMembershipId: "m9", limit: 100 });
    const url = String(spy.mock.calls[0][0]);
    expect(url).toContain("assigneeMembershipId=m9");
    expect(url).toContain("limit=100");
  });

  it("teams: members come back as { id, teamId, membershipId } under data.members", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ members: [{ id: "tm1", teamId: "t1", membershipId: "m1" }] }));
    expect(await teamApi.members("o1", "t1")).toEqual([{ id: "tm1", teamId: "t1", membershipId: "m1" }]);
  });

  it("notifications: message field; preferences use notificationType and are updated per type", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(ok({ notifications: [{ id: "n1", type: "MENTION", title: "Hi", message: "You were mentioned", readAt: null, createdAt: "2026-01-01T00:00:00Z" }], pagination }))
      .mockResolvedValueOnce(ok({ preferences: [{ id: "pr1", notificationType: "MENTION", inAppEnabled: true, emailEnabled: false }] }))
      .mockResolvedValueOnce(ok({ preference: { id: "pr1", notificationType: "MENTION", inAppEnabled: true, emailEnabled: true } }));
    expect((await notificationApi.list("o1")).items[0].message).toBe("You were mentioned");
    expect((await notificationApi.preferences("o1"))[0]).toMatchObject({ notificationType: "MENTION", emailEnabled: false });
    const spy = vi.spyOn(globalThis, "fetch");
    await notificationApi.updatePreference("o1", "MENTION", { emailEnabled: true });
    expect(String(spy.mock.calls.at(-1)![0])).toContain("/notifications/preferences/MENTION");
  });
});

describe("notifications: the unreadOnly flag", () => {
  beforeEach(() => useAuthStore.setState({ accessToken: "t", status: "authenticated" }));
  afterEach(() => vi.restoreAllMocks());
  const lastUrl = (spy: ReturnType<typeof vi.spyOn>) => new URL(String(spy.mock.calls.at(-1)![0]), "http://x");

  it("is NOT sent when false: the backend's z.coerce.boolean() would turn \"false\" into true and hide read notifications", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok({ notifications: [], pagination }));
    await notificationApi.list("o1", { page: 1, limit: 20, unreadOnly: false });
    expect(lastUrl(spy).searchParams.has("unreadOnly")).toBe(false);
    await notificationApi.list("o1", { page: 1, limit: 20 });
    expect(lastUrl(spy).searchParams.has("unreadOnly")).toBe(false);
  });
  it("is sent as unreadOnly=true when requested, together with paging", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok({ notifications: [], pagination }));
    await notificationApi.list("o1", { page: 2, limit: 1, unreadOnly: true });
    const q = lastUrl(spy).searchParams;
    expect([q.get("unreadOnly"), q.get("page"), q.get("limit")]).toEqual(["true", "2", "1"]);
  });
});

describe("invitationStatus (the list endpoint returns every invitation ever issued)", () => {
  const base = { acceptedAt: null, revokedAt: null, expiresAt: "2099-01-01T00:00:00Z" };
  it("derives pending / accepted / revoked / expired", () => {
    expect(invitationStatus(base)).toBe("pending");
    expect(invitationStatus({ ...base, acceptedAt: "2026-01-01T00:00:00Z" })).toBe("accepted");
    expect(invitationStatus({ ...base, revokedAt: "2026-01-01T00:00:00Z" })).toBe("revoked");
    expect(invitationStatus({ ...base, expiresAt: "2020-01-01T00:00:00Z" })).toBe("expired");
  });
  it("accepted wins over expired, revoked wins over expired", () => {
    expect(invitationStatus({ acceptedAt: "2026-01-01T00:00:00Z", revokedAt: null, expiresAt: "2020-01-01T00:00:00Z" })).toBe("accepted");
    expect(invitationStatus({ acceptedAt: null, revokedAt: "2026-01-01T00:00:00Z", expiresAt: "2020-01-01T00:00:00Z" })).toBe("revoked");
  });
});

/** Final-backend additions (FRONTEND_CONTRACT §3, verified against agencyops-api 08f0b20). */
describe("final backend contract additions", () => {
  beforeEach(() => useAuthStore.setState({ accessToken: "t", status: "authenticated" }));
  afterEach(() => vi.restoreAllMocks());
  const user = { id: "u1", name: "Imran Chowdhury", email: "imran@x.io", avatarUrl: null };

  it("organizations: GET /:id also yields the caller's membership with the server's permission list", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ organization: { id: "o1", name: "Acme" }, membership: { id: "m1", role: "MANAGER", permissions: ["project:create", "activity:read"] } }));
    const r = await orgApi.getAccess("o1");
    expect(r.organization.name).toBe("Acme");
    expect(r.membership).toEqual({ id: "m1", role: "MANAGER", permissions: ["project:create", "activity:read"] });
  });

  it("projects: list items carry taskCounts, memberCount and activeSprint; create/update responses don't", async () => {
    const base = { id: "p1", name: "Site", slug: "site", description: null, status: "ACTIVE", startDate: null, dueDate: null, createdAt: "", updatedAt: "" };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(ok({ projects: [{ ...base, taskCounts: { BACKLOG: 4, TODO: 4, IN_PROGRESS: 2, IN_REVIEW: 1, DONE: 5 }, memberCount: 5, activeSprint: { id: "s1", name: "Sprint 2" } }, { ...base, id: "p2", taskCounts: {}, memberCount: 0, activeSprint: null }], pagination }))
      .mockResolvedValueOnce(ok({ project: base }, 201));
    const [a, b] = (await projectApi.list("o1")).items;
    expect(a.taskCounts).toEqual({ BACKLOG: 4, TODO: 4, IN_PROGRESS: 2, IN_REVIEW: 1, DONE: 5 });
    expect([a.memberCount, a.activeSprint]).toEqual([5, { id: "s1", name: "Sprint 2" }]);
    expect(b.taskCounts?.DONE).toBe(0); // missing statuses count as zero
    expect(b.activeSprint).toBeNull();
    const created = await projectApi.create("o1", { name: "Site" });
    expect("taskCounts" in created).toBe(false);
  });

  it("tasks: assignee is flattened from { membershipId, user }; counts pass through", async () => {
    const t = { id: "t1", projectId: "p1", title: "Build", status: "TODO", priority: "HIGH", assigneeMembershipId: "m1", assignee: { membershipId: "m1", user }, subtaskCount: 3, doneSubtaskCount: 1, commentCount: 2 };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ tasks: [t, { ...t, id: "t2", assigneeMembershipId: null, assignee: null }], pagination }));
    const [a, b] = (await taskApi.list("o1", "p1")).items;
    expect(a.assignee).toEqual({ membershipId: "m1", name: "Imran Chowdhury", email: "imran@x.io", avatarUrl: null });
    expect([a.subtaskCount, a.doneSubtaskCount, a.commentCount]).toEqual([3, 1, 2]);
    expect(b.assignee).toBeNull();
  });

  it("comments: author and mentions are flattened", async () => {
    const c = { id: "c1", taskId: "t1", authorMembershipId: "m1", content: "hi @Imran Chowdhury", createdAt: "", updatedAt: "", author: { membershipId: "m1", user }, mentions: [{ membershipId: "m2", user: { ...user, name: "Arif" } }] };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ comments: [c], pagination }));
    const [r] = (await commentApi.list("o1", "p1", "t1")).items;
    expect(r.author?.name).toBe("Imran Chowdhury");
    expect(r.mentions?.map((m) => m.name)).toEqual(["Arif"]);
  });

  it("notifications: data carries the deep-link ids; absent data is null", async () => {
    const n = { id: "n1", type: "TASK_STATUS_CHANGED", title: "t", message: "m", readAt: null, createdAt: "" };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ notifications: [{ ...n, data: { projectId: "p1", taskId: "t1", from: "TODO", to: "DONE", junk: 5 } }, { ...n, id: "n2", data: null }], pagination }));
    const [a, b] = (await notificationApi.list("o1")).items;
    expect(a.data).toEqual({ projectId: "p1", taskId: "t1", from: "TODO", to: "DONE" });
    expect(b.data).toBeNull();
  });

  it("activity: unwraps data.activities and keeps the server-built summary", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ activities: [{ id: "a1", action: "task.created", entityType: "Task", entityId: "t1", projectId: "p1", taskId: "t1", actor: { membershipId: "m1", name: "Arif Hossain" }, summary: "Arif Hossain created task “Migrate blog content”", metadata: { title: "Migrate blog content" }, createdAt: "2026-10-01T00:00:00Z" }, { id: "a2", action: "member.joined", entityType: "Membership", entityId: "m9", projectId: null, taskId: null, actor: null, summary: "Someone joined", metadata: null, createdAt: "" }], pagination }));
    const r = await activityApi.list("o1", { page: 2, limit: 20, entityType: "Task", projectId: "p1" });
    const q = new URL(String(spy.mock.calls[0][0]), "http://x").searchParams;
    expect([q.get("page"), q.get("entityType"), q.get("projectId")]).toEqual(["2", "Task", "p1"]);
    expect(r.items[0]).toMatchObject({ summary: "Arif Hossain created task “Migrate blog content”", actor: { name: "Arif Hossain" }, metadata: { title: "Migrate blog content" } });
    expect(r.items[1]).toMatchObject({ actor: null, metadata: {} });
  });

  it("sprints: complete sends moveOpenTasksTo only when given and returns movedTaskCount (the backend rejects null)", async () => {
    const sprint = { id: "s1", projectId: "p1", name: "S1", status: "COMPLETED", startDate: "", endDate: "" };
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok({ sprint, movedTaskCount: 2 }));
    const bodyOf = (i: number) => (spy.mock.calls[i][1] as RequestInit).body;
    const r = await sprintApi.complete("o1", "p1", "s1", "BACKLOG");
    expect(r.movedTaskCount).toBe(2);
    expect(JSON.parse(bodyOf(0) as string)).toEqual({ moveOpenTasksTo: "BACKLOG" });
    await sprintApi.complete("o1", "p1", "s1");
    expect(bodyOf(1)).toBeUndefined();
  });
});

/** Account & security endpoints (agencyops-api auth.routes.ts / account.controller.ts at 08f0b20). */
describe("account & security contract", () => {
  beforeEach(() => useAuthStore.setState({ accessToken: "t", status: "authenticated" }));
  afterEach(() => vi.restoreAllMocks());
  const call = (spy: ReturnType<typeof vi.spyOn>, i = 0) => ({ url: String(spy.mock.calls[i][0]), init: spy.mock.calls[i][1] as RequestInit });
  const headersOf = (init: RequestInit) => new Headers(init.headers);

  it("me exposes emailVerifiedAt (null until verified)", async () => {
    const user = { id: "u1", name: "Ada", email: "ada@x.io", avatarUrl: null, status: "ACTIVE" };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ user: { ...user, emailVerifiedAt: null } })).mockResolvedValueOnce(ok({ user: { ...user, emailVerifiedAt: "2026-10-01T00:00:00.000Z" } }));
    expect((await authApi.me()).emailVerifiedAt).toBeNull();
    expect((await authApi.me()).emailVerifiedAt).toBe("2026-10-01T00:00:00.000Z");
  });

  it("public flows (verify, forgot, reset) send no Authorization header", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok(null));
    await authApi.verifyEmail("tok-1234567890abcdef");
    await authApi.forgotPassword("a@b.co");
    await authApi.resetPassword("tok-1234567890abcdef", "new-password-1");
    const urls = [0, 1, 2].map((i) => call(spy, i).url);
    expect(urls[0]).toMatch(/\/auth\/verify-email$/); expect(urls[1]).toMatch(/\/auth\/forgot-password$/); expect(urls[2]).toMatch(/\/auth\/reset-password$/);
    for (let i = 0; i < 3; i++) expect(headersOf(call(spy, i).init).get("Authorization")).toBeNull();
    expect(JSON.parse(call(spy, 2).init.body as string)).toEqual({ token: "tok-1234567890abcdef", password: "new-password-1" });
  });

  it("resendVerification returns whether an e-mail was actually sent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ sent: true })).mockResolvedValueOnce(ok({ sent: false }));
    expect(await authApi.resendVerification()).toBe(true);
    expect(await authApi.resendVerification()).toBe(false);
  });

  it("changePassword posts { currentPassword, newPassword } with the access token", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok(null));
    await authApi.changePassword("old-password", "new-password-1");
    const { url, init } = call(spy);
    expect(url).toMatch(/\/auth\/change-password$/);
    expect(headersOf(init).get("Authorization")).toBe("Bearer t");
    expect(JSON.parse(init.body as string)).toEqual({ currentPassword: "old-password", newPassword: "new-password-1" });
  });

  it("sessions: maps the list and flags the current one", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ sessions: [
      { id: "s1", userAgent: "Mozilla/5.0 Chrome/120", ipAddress: "1.2.3.4", createdAt: "2026-10-01T00:00:00Z", lastUsedAt: null, expiresAt: "2026-11-01T00:00:00Z", current: true },
      { id: "s2", userAgent: null, ipAddress: null, createdAt: "2026-09-01T00:00:00Z", lastUsedAt: "2026-09-02T00:00:00Z", expiresAt: "2026-10-30T00:00:00Z", current: false },
    ] }));
    const [a, b] = await authApi.sessions();
    expect([a.current, a.lastUsedAt, b.current, b.userAgent]).toEqual([true, null, false, null]);
  });

  it("revokeSession and deleteAccount use DELETE; the password travels in the body only when given", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok(null));
    await authApi.revokeSession("s2");
    await authApi.deleteAccount("my-password");
    await authApi.deleteAccount();
    expect([call(spy, 0).init.method, call(spy, 0).url.endsWith("/auth/sessions/s2")]).toEqual(["DELETE", true]);
    expect(call(spy, 1).url).toMatch(/\/auth\/account$/);
    expect(JSON.parse(call(spy, 1).init.body as string)).toEqual({ password: "my-password" });
    expect(call(spy, 2).init.body).toBeUndefined();
  });
});

/** Clients, invoices and billing (agencyops-api client/invoice/billing modules at 08f0b20). */
describe("clients, invoices and billing contract", () => {
  beforeEach(() => useAuthStore.setState({ accessToken: "t", status: "authenticated" }));
  afterEach(() => vi.restoreAllMocks());
  const req = (spy: ReturnType<typeof vi.spyOn>, i = 0) => ({ url: new URL(String(spy.mock.calls[i][0]), "http://x"), init: spy.mock.calls[i][1] as RequestInit });
  const client = { id: "c1", name: "Brightline", website: "https://b.io", notes: null, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" };
  const contact = { id: "k1", clientOrganizationId: "c1", name: "Dana", email: "dana@b.io", jobTitle: null, status: "INVITED", lastLoginAt: null, createdAt: "" };

  it("clients: list unwraps data.clients with search/sort params; get unwraps data.client", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ clients: [client], pagination })).mockResolvedValueOnce(ok({ client }));
    const r = await clientApi.list("o1", { page: 2, limit: 12, search: "bright", sortBy: "name", sortOrder: "asc" });
    expect(r.items[0].name).toBe("Brightline");
    const q = req(spy).url.searchParams;
    expect([req(spy).url.pathname, q.get("page"), q.get("search"), q.get("sortBy"), q.get("sortOrder")]).toEqual(["/api/v1/organizations/o1/clients", "2", "bright", "name", "asc"]);
    expect((await clientApi.get("o1", "c1")).website).toBe("https://b.io");
  });

  it("clients: update can clear website/notes with null", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ client }));
    await clientApi.update("o1", "c1", { name: "B", website: null, notes: null });
    expect(req(spy).init.method).toBe("PATCH");
    expect(JSON.parse(req(spy).init.body as string)).toEqual({ name: "B", website: null, notes: null });
  });

  it("contacts: create returns the invite token only when the server exposes it", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ contact, inviteToken: "tok-abc" }, 201)).mockResolvedValueOnce(ok({ contact }, 201));
    expect(await clientApi.createContact("o1", "c1", { name: "Dana", email: "dana@b.io" })).toMatchObject({ inviteToken: "tok-abc", contact: { status: "INVITED" } });
    expect((await clientApi.createContact("o1", "c1", { name: "Dana", email: "dana@b.io" })).inviteToken).toBeNull();
  });

  it("contacts: reinvite/enable POST, disable DELETE, access grant/revoke use the project id", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok({ contact }));
    await clientApi.reinvite("o1", "c1", "k1");
    await clientApi.enableContact("o1", "c1", "k1");
    await clientApi.disableContact("o1", "c1", "k1");
    await clientApi.grantAccess("o1", "c1", "k1", "p1");
    await clientApi.revokeAccess("o1", "c1", "k1", "p1");
    const calls = [0, 1, 2, 3, 4].map((i) => `${req(spy, i).init.method} ${req(spy, i).url.pathname.replace("/api/v1/organizations/o1/clients/c1/", "")}`);
    expect(calls).toEqual(["POST contacts/k1/reinvite", "POST contacts/k1/enable", "DELETE contacts/k1", "POST contacts/k1/access", "DELETE contacts/k1/access/p1"]);
    expect(JSON.parse(req(spy, 3).init.body as string)).toEqual({ projectId: "p1" });
  });

  it("client projects and access lists are mapped", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(ok({ projects: [{ id: "p1", name: "Site", slug: "site", status: "ACTIVE" }] }))
      .mockResolvedValueOnce(ok({ access: [{ id: "a1", clientContactId: "k1", projectId: "p1", createdAt: "" }] }));
    expect((await clientApi.projects("o1", "c1"))[0]).toEqual({ id: "p1", name: "Site", slug: "site", status: "ACTIVE" });
    expect((await clientApi.access("o1", "c1", "k1"))[0].projectId).toBe("p1");
  });

  const invoice = { id: "i1", number: "INV-0001", status: "OPEN", clientId: "c1", projectId: null, issueDate: "", dueDate: "", currency: "usd", subtotalCents: 10000, taxCents: 0, discountCents: 0, totalCents: 10000, notes: null, sentAt: null, paidAt: null, voidedAt: null, pdfUrl: null, pdfGeneratedAt: null, createdAt: "",
    items: [{ description: "Design", quantity: 2, unitAmountCents: 5000, amountCents: 10000 }], payments: [{ id: "pay1", amountCents: 10000, currency: "usd", status: "FAILED", failureReason: "Card declined", paidAt: null, createdAt: "" }] };

  it("invoices: the response IS the invoice (no wrapper); list uses data.invoices and the filters", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok(invoice)).mockResolvedValueOnce(ok({ invoices: [invoice], pagination }));
    const one = await invoiceApi.get("o1", "i1");
    expect(one).toMatchObject({ number: "INV-0001", totalCents: 10000, items: [{ amountCents: 10000 }], payments: [{ status: "FAILED", failureReason: "Card declined" }] });
    await invoiceApi.list("o1", { status: "OPEN", clientId: "c1", page: 3 });
    const q = req(spy, 1).url.searchParams;
    expect([q.get("status"), q.get("clientId"), q.get("page")]).toEqual(["OPEN", "c1", "3"]);
  });

  it("invoices: create sends cents and ISO dates; send/void/pdf hit their endpoints", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok(invoice, 201));
    await invoiceApi.create("o1", { clientId: "c1", issueDate: "2026-10-01T00:00:00.000Z", dueDate: "2026-10-15T00:00:00.000Z", currency: "usd", taxCents: 0, discountCents: 0, items: [{ description: "Design", quantity: 2, unitAmountCents: 5000 }] });
    await invoiceApi.send("o1", "i1"); await invoiceApi.void("o1", "i1"); await invoiceApi.requestPdf("o1", "i1");
    expect(JSON.parse(req(spy, 0).init.body as string)).toMatchObject({ clientId: "c1", items: [{ unitAmountCents: 5000 }] });
    expect([1, 2, 3].map((i) => `${req(spy, i).init.method} ${req(spy, i).url.pathname.split("/").slice(-1)[0]}`)).toEqual(["POST send", "POST void", "POST pdf"]);
  });

  it("billing: maps plan + subscription; checkout/portal return the Stripe URL and reject a response without one", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(ok({ plan: { code: "PRO", name: "Pro", maxMembers: null, maxProjects: null }, subscription: { status: "active", currentPeriodEnd: "2026-11-01T00:00:00Z", cancelAtPeriodEnd: true, hasBillingAccount: true } }))
      .mockResolvedValueOnce(ok({ url: "https://checkout.stripe.com/c/pay/cs_test" }, 201))
      .mockResolvedValueOnce(ok({}, 201));
    const b = await billingApi.get("o1");
    expect(b.plan).toEqual({ code: "PRO", name: "Pro", maxMembers: null, maxProjects: null });
    expect(b.subscription).toMatchObject({ status: "active", cancelAtPeriodEnd: true, hasBillingAccount: true });
    expect(await billingApi.checkout("o1")).toBe("https://checkout.stripe.com/c/pay/cs_test");
    await expect(billingApi.portal("o1")).rejects.toThrow();
  });
});

/** Client collaboration (staff) and task attachments (agencyops-api client-collaboration / attachment modules at 08f0b20). */
describe("collaboration & attachments contract", () => {
  beforeEach(() => useAuthStore.setState({ accessToken: "t", status: "authenticated" }));
  afterEach(() => vi.restoreAllMocks());
  const req = (spy: ReturnType<typeof vi.spyOn>, i = 0) => ({ url: new URL(String(spy.mock.calls[i][0]), "http://x"), init: spy.mock.calls[i][1] as RequestInit });

  it("updates/messages/files: list keys, nested author shapes and the project-scoped paths", async () => {
    const spy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(ok({ updates: [{ id: "u1", title: "T", body: "B", createdAt: "", author: { name: "Arif" } }], pagination }))
      .mockResolvedValueOnce(ok({ messages: [{ id: "m1", content: "hi", createdAt: "", author: { type: "CLIENT", name: "Dana" } }, { id: "m2", content: "yo", createdAt: "", author: { type: "STAFF", name: "Arif" } }], pagination }))
      .mockResolvedValueOnce(ok({ files: [{ id: "f1", originalFilename: "a.pdf", url: "https://x/a.pdf", mimeType: "application/pdf", sizeBytes: 10, createdAt: "", uploadedBy: { type: "CLIENT", name: "Dana" } }], pagination }));
    expect((await collabApi.updates("o1", "p1", { page: 2, limit: 10 })).items[0].author.name).toBe("Arif");
    const msgs = (await collabApi.messages("o1", "p1")).items;
    expect(msgs.map((m) => m.author.type)).toEqual(["CLIENT", "STAFF"]);
    expect((await collabApi.files("o1", "p1")).items[0]).toMatchObject({ sizeBytes: 10, uploadedBy: { type: "CLIENT" } });
    expect([0, 1, 2].map((i) => req(spy, i).url.pathname)).toEqual(["/api/v1/organizations/o1/client-portal/projects/p1/updates", "/api/v1/organizations/o1/client-portal/projects/p1/messages", "/api/v1/organizations/o1/client-portal/projects/p1/files"]);
    expect(req(spy, 0).url.searchParams.get("page")).toBe("2");
  });

  it("post/delete use the singular response keys and DELETE", async () => {
    const spy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(ok({ update: { id: "u1", title: "T", body: "B", createdAt: "", author: { name: "A" } } }, 201))
      .mockResolvedValueOnce(ok({ message: { id: "m1", content: "hi", createdAt: "", author: { type: "STAFF", name: "A" } } }, 201))
      .mockImplementation(async () => ok(null));
    expect((await collabApi.postUpdate("o1", "p1", { title: "T", body: "B" })).id).toBe("u1");
    expect((await collabApi.postMessage("o1", "p1", "hi")).author.type).toBe("STAFF");
    expect(JSON.parse(req(spy, 1).init.body as string)).toEqual({ content: "hi" });
    await collabApi.deleteUpdate("o1", "p1", "u1"); await collabApi.deleteMessage("o1", "p1", "m1"); await collabApi.deleteFile("o1", "p1", "f1");
    expect([2, 3, 4].map((i) => `${req(spy, i).init.method} ${req(spy, i).url.pathname.split("/").slice(-2).join("/")}`)).toEqual(["DELETE updates/u1", "DELETE messages/m1", "DELETE files/f1"]);
  });

  it("requests: org-wide inbox with filters; PATCH sends only what's given (null clears the note)", async () => {
    const r = { id: "r1", projectId: "p1", type: "ISSUE", title: "Bug", description: "d", status: "OPEN", resolutionNote: null, createdAt: "", updatedAt: "", resolvedAt: null, contact: { id: "k1", name: "Dana", email: "d@b.io" }, handledByMembershipId: null };
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ requests: [r], pagination })).mockResolvedValueOnce(ok({ request: { ...r, status: "RESOLVED" } }));
    const list = await collabApi.requests("o1", { status: "OPEN", type: "ISSUE", projectId: "p1", page: 2 });
    expect(list.items[0]).toMatchObject({ type: "ISSUE", contact: { name: "Dana", email: "d@b.io" } });
    const q = req(spy).url.searchParams;
    expect([req(spy).url.pathname, q.get("status"), q.get("type"), q.get("projectId"), q.get("page")]).toEqual(["/api/v1/organizations/o1/client-portal/requests", "OPEN", "ISSUE", "p1", "2"]);
    await collabApi.updateRequest("o1", "r1", { resolutionNote: null });
    expect(req(spy, 1).init.method).toBe("PATCH");
    expect(JSON.parse(req(spy, 1).init.body as string)).toEqual({ resolutionNote: null });
  });

  it("task visibility returns the value the server confirms", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ task: { id: "t1", clientVisible: true } }));
    expect(await collabApi.setTaskVisibility("o1", "p1", "t1", true)).toBe(true);
    expect(req(spy).url.pathname).toBe("/api/v1/organizations/o1/client-portal/projects/p1/tasks/t1/visibility");
    expect(JSON.parse(req(spy).init.body as string)).toEqual({ clientVisible: true });
  });

  it("task attachments: list is a plain array under `attachments`; delete targets the id", async () => {
    const spy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(ok({ attachments: [{ id: "a1", taskId: "t1", uploadedByMembershipId: "m1", originalFilename: "w.png", url: "https://x/w.png", mimeType: "image/png", sizeBytes: 99, createdAt: "" }] }))
      .mockResolvedValueOnce(ok(null));
    expect((await attachmentApi.list("o1", "p1", "t1"))[0]).toMatchObject({ originalFilename: "w.png", sizeBytes: 99 });
    expect(req(spy).url.pathname).toBe("/api/v1/organizations/o1/projects/p1/tasks/t1/attachments");
    await attachmentApi.remove("o1", "p1", "t1", "a1");
    expect([req(spy, 1).init.method, req(spy, 1).url.pathname.endsWith("/attachments/a1")]).toEqual(["DELETE", true]);
  });

  it("tasks map clientVisible only when the backend sends it", async () => {
    const t = { id: "t1", projectId: "p1", title: "x", status: "TODO", priority: "LOW" };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(ok({ task: t })).mockResolvedValueOnce(ok({ task: { ...t, clientVisible: false } }));
    expect("clientVisible" in (await taskApi.get("o1", "p1", "t1"))).toBe(false);
    expect((await taskApi.get("o1", "p1", "t1")).clientVisible).toBe(false);
  });
});
