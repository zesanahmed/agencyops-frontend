import { describe, expect, it } from "vitest";
import { PERMISSIONS, can, canWith, type Permission } from "./rbac";
import type { Role } from "@/types/domain";

const allowed = (role: Role) => PERMISSIONS.filter((p) => can(role, p));
const denied = (role: Role) => PERMISSIONS.filter((p) => !can(role, p));

/** Expected values are copied from the backend's permissions.ts (afe5f62), independently of rbac.ts. */
describe("RBAC matrix mirrors the backend", () => {
  it("OWNER holds every permission", () => {
    expect(denied("OWNER")).toEqual([]);
  });

  it("MANAGER lacks exactly the organization/membership administration permissions and billing management", () => {
    expect(denied("MANAGER")).toEqual<Permission[]>(["organization:update", "organization:delete", "membership:update", "membership:remove", "billing:manage"]);
  });

  it("TEAM_MEMBER can read, create/update tasks, comment and see their projects' activity — nothing else", () => {
    expect(allowed("TEAM_MEMBER").sort()).toEqual<Permission[]>([
      "activity:read", "client-portal:read", "client:read",
      "comment:create", "comment:read", "membership:read", "organization:read", "project:read",
      "sprint:read", "task:create", "task:read", "task:update", "team:read",
    ].sort() as Permission[]);
  });

  it("only OWNER/MANAGER read the whole organization's activity; only OWNER manages billing", () => {
    expect(can("TEAM_MEMBER", "activity:read-all")).toBe(false);
    expect(can("MANAGER", "activity:read-all")).toBe(true);
    expect(can("MANAGER", "billing:manage")).toBe(false);
    expect(can("OWNER", "billing:manage")).toBe(true);
  });

  it("canWith trusts the server's permission list and falls back to the matrix while it is missing", () => {
    expect(canWith("OWNER", ["task:read"], "task:delete")).toBe(false);
    expect(canWith("TEAM_MEMBER", ["task:read", "task:delete"], "task:delete")).toBe(true);
    expect(canWith("MANAGER", undefined, "task:delete")).toBe(true);
    expect(canWith(undefined, [], "task:delete")).toBe(false);
  });

  it("only OWNER can change roles, remove members or edit/delete the organization", () => {
    for (const p of ["membership:update", "membership:remove", "organization:update", "organization:delete"] as Permission[]) {
      expect(can("OWNER", p)).toBe(true);
      expect(can("MANAGER", p)).toBe(false);
      expect(can("TEAM_MEMBER", p)).toBe(false);
    }
  });

  it("MANAGER can invite; TEAM_MEMBER cannot even list invitations", () => {
    expect(can("MANAGER", "invitation:create")).toBe(true);
    expect(can("TEAM_MEMBER", "invitation:read")).toBe(false);
  });

  it("TEAM_MEMBER cannot delete tasks or moderate comments; MANAGER can", () => {
    expect(can("TEAM_MEMBER", "task:delete")).toBe(false);
    expect(can("TEAM_MEMBER", "comment:moderate")).toBe(false);
    expect(can("MANAGER", "task:delete")).toBe(true);
    expect(can("MANAGER", "comment:moderate")).toBe(true);
  });

  it("denies everything when the role is unknown", () => {
    for (const p of PERMISSIONS) expect(can(undefined, p)).toBe(false);
  });
});
