/**
 * Domain types matching the backend's wire format EXACTLY. Source of truth:
 * zesanahmed/agencyops-api (each module's mappers file under src/modules, plus the prisma enums),
 * verified at commit afe5f62 (2026-09-28). When the backend changes, update
 * this file, src/lib/api/mappers.ts and the tests together.
 *
 * Note the backend returns IDs, not nested objects: tasks, comments, team
 * members etc. carry `...MembershipId`. Names are resolved on the client via
 * the member directory (features/members/use-member-directory.ts).
 */
export const ROLES = ["OWNER", "MANAGER", "TEAM_MEMBER"] as const;
export type Role = (typeof ROLES)[number];
/** OWNER can only be assigned when an organization is created. */
export type AssignableRole = Exclude<Role, "OWNER">;
export const ASSIGNABLE_ROLES: readonly AssignableRole[] = ["MANAGER", "TEAM_MEMBER"];

export const PROJECT_STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const TASK_STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const SPRINT_STATUSES = ["PLANNED", "ACTIVE", "COMPLETED"] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

/** Note: no `role` — the backend does not include the caller's role on organizations. */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  ownerId: string;
  status: string;
  createdAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: Role;
  status: string;
  joinedAt: string;
  /** Flattened from `user` (always included by GET /members). */
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  invitedByMembershipId: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}
export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

/** The list endpoint returns every invitation ever issued; status is derived. */
export function invitationStatus(i: Pick<Invitation, "acceptedAt" | "revokedAt" | "expiresAt">, now: number = Date.now()): InvitationStatus {
  if (i.acceptedAt) return "accepted";
  if (i.revokedAt) return "revoked";
  return new Date(i.expiresAt).getTime() > now ? "pending" : "expired";
}

export interface InvitationPreview {
  organizationName: string;
  email: string;
  role: Role;
  expiresAt: string;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}
export interface TeamMember { id: string; teamId: string; membershipId: string }

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface ProjectTeam { id: string; projectId: string; teamId: string }
export interface ProjectMember { id: string; projectId: string; membershipId: string }

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  startDate: string;
  endDate: string;
}

export interface Task {
  id: string;
  projectId: string;
  sprintId: string | null;
  parentTaskId: string | null;
  assigneeMembershipId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
}
export interface TaskCollaborator { id: string; taskId: string; membershipId: string }

export interface Comment {
  id: string;
  taskId: string;
  authorMembershipId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  notificationType: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
}
