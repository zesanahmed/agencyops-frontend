import { describe, expect, it } from "vitest";
import { mapMembership, mapOrganization, mapTask, mapTeamMember } from "./mappers";

describe("mappers tolerate plausible backend shapes", () => {
  it("reads role from a membership wrapping an organization", () => {
    const o = mapOrganization({ role: "MANAGER", organization: { id: "o1", name: "Acme" } });
    expect(o).toMatchObject({ id: "o1", name: "Acme", role: "MANAGER" });
  });
  it("reads a bare organization", () => {
    expect(mapOrganization({ id: "o2", name: "Bare" })).toMatchObject({ id: "o2", name: "Bare", role: undefined });
  });
  it("maps membership with nested or flat user", () => {
    expect(mapMembership({ id: "m1", role: "OWNER", user: { id: "u1", name: "Ada", email: "a@x.io" } })).toMatchObject({ name: "Ada", email: "a@x.io", userId: "u1" });
    expect(mapMembership({ id: "m2", role: "TEAM_MEMBER", name: "Bob", email: "b@x.io" })).toMatchObject({ name: "Bob" });
  });
  it("never invents a role", () => {
    expect(mapMembership({ id: "m3", role: "SUPERUSER" }).role).toBe("TEAM_MEMBER");
    expect(mapOrganization({ id: "o", name: "n", role: "SUPERUSER" }).role).toBeUndefined();
  });
  it("maps team members via nested membership", () => {
    expect(mapTeamMember({ id: "t1", membership: { id: "m9", user: { name: "Cy", email: "c@x.io" } } })).toMatchObject({ membershipId: "m9", name: "Cy" });
  });
  it("maps task assignee name and defaults", () => {
    expect(mapTask({ id: "x", title: "T", assignee: { id: "m1", user: { name: "Ada" } } })).toMatchObject({ assigneeName: "Ada", assigneeMembershipId: "m1", status: "TODO", priority: "MEDIUM" });
  });
});
