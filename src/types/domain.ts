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
  /** ISO timestamp once the e-mail address is verified; null until then. Absent on partial payloads. */
  emailVerifiedAt?: string | null;
}

/** One active sign-in (a refresh-token session) of the current user: GET /auth/sessions. */
export interface UserSession {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
  /** True for the session making this request. */
  current: boolean;
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
  /** Aggregates added by the final backend (list + detail). Absent on create/update responses. */
  taskCounts?: Record<TaskStatus, number>;
  memberCount?: number;
  activeSprint?: { id: string; name: string } | null;
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

/** `{ membershipId, user }` is how the final backend embeds people (assignee, comment author/mentions, collaborators). */
export interface PersonRef { membershipId: string; name: string; email: string; avatarUrl: string | null }

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
  /** Added by the final backend on list + detail. */
  assignee?: PersonRef | null;
  subtaskCount?: number;
  doneSubtaskCount?: number;
  commentCount?: number;
}
export interface TaskCollaborator { id: string; taskId: string; membershipId: string }

export interface Comment {
  id: string;
  taskId: string;
  authorMembershipId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author?: PersonRef | null;
  mentions?: PersonRef[];
}

/** Deep-link payload; its keys depend on `type` (see FRONTEND_CONTRACT §3.7). */
export type NotificationData = Partial<Record<"projectId" | "taskId" | "commentId" | "sprintId" | "invoiceId" | "messageId" | "requestId" | "fileId" | "from" | "to", string>>;

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: NotificationData | null;
  readAt: string | null;
  createdAt: string;
}

export const ACTIVITY_ENTITY_TYPES = ["Project", "Sprint", "Task", "Comment", "Membership"] as const;
export type ActivityEntityType = (typeof ACTIVITY_ENTITY_TYPES)[number];

/** One entry of GET /organizations/:orgId/activity. `summary` is rendered as-is. */
export interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  projectId: string | null;
  taskId: string | null;
  actor: { membershipId: string; name: string } | null;
  summary: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: string;
}

/** The caller's membership in one organization, as returned by GET /organizations/:orgId. */
export interface OrgMembership { id: string; role: Role; permissions: string[] }

export interface NotificationPreference {
  id: string;
  notificationType: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
}
