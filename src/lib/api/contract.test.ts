import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityApi, authApi, commentApi, invitationApi, memberApi, notificationApi, orgApi, projectApi, sprintApi, taskApi, teamApi } from "./services";
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
