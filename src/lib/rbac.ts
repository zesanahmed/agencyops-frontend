import type { Role } from "@/types/domain";

/**
 * FRONTEND-ONLY permission map, used to hide/disable UI. The backend matrix
 * (src/modules/rbac/permissions.ts) is authoritative and enforces everything.
 *
 * Documented facts: org delete = OWNER only; invitations = OWNER/MANAGER;
 * comment edit = author only; comment delete = author or OWNER/MANAGER.
 * Everything else is a conservative assumption. RECONCILE with the backend
 * file when it is available; a wrong guess here only affects which buttons
 * show, and a 403 is surfaced as a toast.
 */
export type Permission =
  | "organization.update" | "organization.delete"
  | "member.invite" | "member.updateRole" | "member.remove"
  | "team.manage" | "project.manage" | "sprint.manage"
  | "task.create" | "task.update" | "task.delete"
  | "comment.create" | "comment.moderate";

const MANAGE: Permission[] = [
  "member.invite", "member.remove", "team.manage", "project.manage", "sprint.manage",
  "task.create", "task.update", "task.delete", "comment.create", "comment.moderate",
];

const MATRIX: Record<Role, ReadonlySet<Permission>> = {
  OWNER: new Set<Permission>([...MANAGE, "organization.update", "organization.delete", "member.updateRole"]),
  MANAGER: new Set<Permission>(MANAGE),
  TEAM_MEMBER: new Set<Permission>(["task.create", "task.update", "comment.create"]),
};

export function can(role: Role | undefined, permission: Permission): boolean {
  return role ? MATRIX[role].has(permission) : false;
}

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  TEAM_MEMBER: "Team member",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  OWNER: "Full control of the organization, billing and members.",
  MANAGER: "Runs teams, projects and sprints; invites people.",
  TEAM_MEMBER: "Works on assigned tasks and collaborates in comments.",
};
