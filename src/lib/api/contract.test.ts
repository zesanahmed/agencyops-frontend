import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authApi, invitationApi, memberApi, notificationApi, orgApi, projectApi, taskApi, teamApi } from "./services";
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
