import type { Role } from "@/types/domain";

/**
 * Mirror of the backend permission matrix: zesanahmed/agencyops-api,
 * src/modules/rbac/permissions.ts (verified at commit 08f0b20, 2026-10-21).
 * At runtime the server's own list (GET /organizations/:id -> membership.permissions) takes precedence;
 * this matrix is only the fallback while that response is loading.
 * Permission strings are the backend's own `resource:action` names.
 *
 * This is for showing/hiding UI only. The backend enforces every permission on
 * every request; a hidden button is a convenience, never the security boundary.
 * If the backend matrix changes, update this file and rbac.test.ts together.
 */
export const PERMISSIONS = [
  "organization:read", "organization:update", "organization:delete",
  "membership:read", "membership:update", "membership:remove",
  "invitation:create", "invitation:read", "invitation:revoke",
  "team:create", "team:read", "team:update", "team:delete", "team:manage-members",
  "project:create", "project:read", "project:update", "project:delete", "project:manage-teams", "project:manage-members",
  "sprint:create", "sprint:read", "sprint:update", "sprint:delete",
  "task:create", "task:read", "task:update", "task:delete",
  "comment:create", "comment:read", "comment:moderate",
  "client:create", "client:read", "client:update", "client:delete", "client:manage-access",
  "client-portal:read", "client-portal:manage",
  "billing:read", "billing:manage", "invoice:read", "invoice:manage",
  "activity:read", "activity:read-all",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: PERMISSIONS,
  MANAGER: [
    "organization:read", "membership:read",
    "invitation:create", "invitation:read", "invitation:revoke",
    "team:create", "team:read", "team:update", "team:delete", "team:manage-members",
    "project:create", "project:read", "project:update", "project:delete", "project:manage-teams", "project:manage-members",
    "sprint:create", "sprint:read", "sprint:update", "sprint:delete",
    "task:create", "task:read", "task:update", "task:delete",
    "comment:create", "comment:read", "comment:moderate",
    "client:create", "client:read", "client:update", "client:delete", "client:manage-access",
    "client-portal:read", "client-portal:manage",
    "billing:read", "invoice:read", "invoice:manage",
    "activity:read", "activity:read-all",
  ],
  TEAM_MEMBER: [
    "organization:read", "membership:read", "team:read", "project:read", "sprint:read",
    "task:create", "task:read", "task:update", "comment:create", "comment:read",
    "client:read", "client-portal:read", "activity:read",
  ],
};

export function can(role: Role | undefined, permission: Permission): boolean {
  return role ? ROLE_PERMISSIONS[role].includes(permission) : false;
}

/** Prefers the server-provided permission list; falls back to the mirrored matrix until it has loaded. */
export function canWith(role: Role | undefined, serverPermissions: readonly string[] | undefined, permission: Permission): boolean {
  return serverPermissions && serverPermissions.length ? serverPermissions.includes(permission) : can(role, permission);
}

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  TEAM_MEMBER: "Team member",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  OWNER: "Full control, including organization settings, member roles and removals. Assigned only when an organization is created.",
  MANAGER: "Runs teams, projects, sprints and tasks, and invites people. Can't change organization settings, member roles or remove members.",
  TEAM_MEMBER: "Views teams, projects and sprints; creates and updates tasks; comments. Can't manage projects, teams or people.",
};
