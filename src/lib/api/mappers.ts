import {
  ROLES, PROJECT_STATUSES, SPRINT_STATUSES, TASK_PRIORITIES, TASK_STATUSES,
  type Activity, type AppNotification, type UserSession, type NotificationData, type OrgMembership, type PersonRef, type Comment, type Invitation, type InvitationPreview, type Membership,
  type NotificationPreference, type Organization, type Project, type ProjectMember, type ProjectTeam,
  type Role, type Sprint, type Task, type TaskCollaborator, type Team, type TeamMember, type User,
} from "@/types/domain";

/**
 * Wire → domain mappers. Field names are the backend's exact `Safe*` shapes
 * (see types/domain.ts). Guards exist only so one malformed row can't crash a
 * list; they are not guessing at alternative shapes any more.
 */
type R = Record<string, unknown>;
const rec = (v: unknown): R => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as R) : {});
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const nstr = (v: unknown): string | null => (typeof v === "string" ? v : null);
const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

/** Reads `data[key]` from an unwrapped response body (`{ organization: {...} }` → the inner object). */
export function pick(data: unknown, key: string): unknown {
  return rec(data)[key];
}
export function pickArray(data: unknown, key: string): unknown[] {
  const v = rec(data)[key];
  return Array.isArray(v) ? v : [];
}

export const asRole = (v: unknown): Role | undefined => (ROLES.includes(v as Role) ? (v as Role) : undefined);

export function mapUser(raw: unknown): User {
  const r = rec(raw);
  return { id: str(r.id), name: str(r.name), email: str(r.email), avatarUrl: nstr(r.avatarUrl), ...("emailVerifiedAt" in r ? { emailVerifiedAt: nstr(r.emailVerifiedAt) } : {}) };
}

export function mapSession(raw: unknown): UserSession {
  const r = rec(raw);
  return { id: str(r.id), userAgent: nstr(r.userAgent), ipAddress: nstr(r.ipAddress), createdAt: str(r.createdAt), lastUsedAt: nstr(r.lastUsedAt), expiresAt: str(r.expiresAt), current: r.current === true };
}

export function mapOrganization(raw: unknown): Organization {
  const r = rec(raw);
  return { id: str(r.id), name: str(r.name, "Untitled organization"), slug: str(r.slug), logoUrl: nstr(r.logoUrl), ownerId: str(r.ownerId), status: str(r.status), createdAt: str(r.createdAt) };
}

export function mapMembership(raw: unknown): Membership {
  const r = rec(raw);
  const u = rec(r.user);
  return {
    id: str(r.id), userId: str(r.userId), organizationId: str(r.organizationId),
    role: oneOf(ROLES, r.role, "TEAM_MEMBER"), status: str(r.status), joinedAt: str(r.joinedAt),
    name: str(u.name) || str(u.email) || "Unknown member", email: str(u.email), avatarUrl: nstr(u.avatarUrl),
  };
}

export function mapInvitation(raw: unknown): Invitation {
  const r = rec(raw);
  return {
    id: str(r.id), email: str(r.email), role: oneOf(ROLES, r.role, "TEAM_MEMBER"),
    invitedByMembershipId: str(r.invitedByMembershipId), expiresAt: str(r.expiresAt),
    acceptedAt: nstr(r.acceptedAt), revokedAt: nstr(r.revokedAt), createdAt: str(r.createdAt),
  };
}

export function mapInvitationPreview(raw: unknown): InvitationPreview {
  const r = rec(raw);
  return { organizationName: str(r.organizationName), email: str(r.email), role: oneOf(ROLES, r.role, "TEAM_MEMBER"), expiresAt: str(r.expiresAt) };
}

export function mapTeam(raw: unknown): Team {
  const r = rec(raw);
  return { id: str(r.id), name: str(r.name, "Untitled team"), description: nstr(r.description), createdAt: str(r.createdAt) };
}
export function mapTeamMember(raw: unknown): TeamMember {
  const r = rec(raw);
  return { id: str(r.id), teamId: str(r.teamId), membershipId: str(r.membershipId) };
}

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** `{ membershipId, user: { id, name, email, avatarUrl } }` -> flat person. Null when the backend sent none (e.g. a removed member). */
export function mapPersonRef(raw: unknown): PersonRef | null {
  const r = rec(raw);
  const u = rec(r.user);
  const membershipId = str(r.membershipId);
  if (!membershipId) return null;
  return { membershipId, name: str(u.name) || str(u.email) || "Unknown member", email: str(u.email), avatarUrl: nstr(u.avatarUrl) };
}

function mapTaskCounts(raw: unknown): Record<(typeof TASK_STATUSES)[number], number> {
  const r = rec(raw);
  return Object.fromEntries(TASK_STATUSES.map((s) => [s, num(r[s]) ?? 0])) as Record<(typeof TASK_STATUSES)[number], number>;
}

export function mapProject(raw: unknown): Project {
  const r = rec(raw);
  const sprint = rec(r.activeSprint);
  return {
    id: str(r.id), name: str(r.name, "Untitled project"), slug: str(r.slug), description: nstr(r.description),
    status: oneOf(PROJECT_STATUSES, r.status, "ACTIVE"), startDate: nstr(r.startDate), dueDate: nstr(r.dueDate),
    createdAt: str(r.createdAt), updatedAt: str(r.updatedAt),
    // Aggregates exist only on list/detail responses; keep them absent (not zero) elsewhere.
    ...("taskCounts" in r ? { taskCounts: mapTaskCounts(r.taskCounts) } : {}),
    ...(num(r.memberCount) !== undefined ? { memberCount: num(r.memberCount) } : {}),
    ...("activeSprint" in r ? { activeSprint: str(sprint.id) ? { id: str(sprint.id), name: str(sprint.name, "Sprint") } : null } : {}),
  };
}
export function mapProjectTeam(raw: unknown): ProjectTeam {
  const r = rec(raw);
  return { id: str(r.id), projectId: str(r.projectId), teamId: str(r.teamId) };
}
export function mapProjectMember(raw: unknown): ProjectMember {
  const r = rec(raw);
  return { id: str(r.id), projectId: str(r.projectId), membershipId: str(r.membershipId) };
}

export function mapSprint(raw: unknown): Sprint {
  const r = rec(raw);
  return {
    id: str(r.id), projectId: str(r.projectId), name: str(r.name, "Sprint"), goal: nstr(r.goal),
    status: oneOf(SPRINT_STATUSES, r.status, "PLANNED"), startDate: str(r.startDate), endDate: str(r.endDate),
  };
}

export function mapTask(raw: unknown): Task {
  const r = rec(raw);
  return {
    id: str(r.id), projectId: str(r.projectId), sprintId: nstr(r.sprintId), parentTaskId: nstr(r.parentTaskId),
    assigneeMembershipId: nstr(r.assigneeMembershipId), title: str(r.title, "Untitled task"), description: nstr(r.description),
    status: oneOf(TASK_STATUSES, r.status, "TODO"), priority: oneOf(TASK_PRIORITIES, r.priority, "MEDIUM"),
    startDate: nstr(r.startDate), dueDate: nstr(r.dueDate), createdAt: str(r.createdAt),
    ...("assignee" in r ? { assignee: mapPersonRef(r.assignee) } : {}),
    ...(num(r.subtaskCount) !== undefined ? { subtaskCount: num(r.subtaskCount) } : {}),
    ...(num(r.doneSubtaskCount) !== undefined ? { doneSubtaskCount: num(r.doneSubtaskCount) } : {}),
    ...(num(r.commentCount) !== undefined ? { commentCount: num(r.commentCount) } : {}),
  };
}
export function mapTaskCollaborator(raw: unknown): TaskCollaborator {
  const r = rec(raw);
  return { id: str(r.id), taskId: str(r.taskId), membershipId: str(r.membershipId) };
}

export function mapComment(raw: unknown): Comment {
  const r = rec(raw);
  return {
    id: str(r.id), taskId: str(r.taskId), authorMembershipId: str(r.authorMembershipId), content: str(r.content), createdAt: str(r.createdAt), updatedAt: str(r.updatedAt),
    ...("author" in r ? { author: mapPersonRef(r.author) } : {}),
    ...(Array.isArray(r.mentions) ? { mentions: r.mentions.map(mapPersonRef).filter((p): p is PersonRef => p !== null) } : {}),
  };
}

const DATA_KEYS = ["projectId", "taskId", "commentId", "sprintId", "invoiceId", "messageId", "requestId", "fileId", "from", "to"] as const;
function mapNotificationData(raw: unknown): NotificationData | null {
  const r = rec(raw);
  const out: NotificationData = {};
  for (const k of DATA_KEYS) if (typeof r[k] === "string" && r[k]) out[k] = r[k] as string;
  return Object.keys(out).length ? out : null;
}

export function mapNotification(raw: unknown): AppNotification {
  const r = rec(raw);
  return { id: str(r.id), type: str(r.type, "GENERAL"), title: str(r.title, "Notification"), message: str(r.message), data: mapNotificationData(r.data), readAt: nstr(r.readAt), createdAt: str(r.createdAt) };
}

export function mapActivity(raw: unknown): Activity {
  const r = rec(raw);
  const a = rec(r.actor);
  const meta = rec(r.metadata);
  const metadata: Activity["metadata"] = {};
  for (const [k, v] of Object.entries(meta)) if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") metadata[k] = v;
  return {
    id: str(r.id), action: str(r.action), entityType: str(r.entityType), entityId: str(r.entityId),
    projectId: nstr(r.projectId), taskId: nstr(r.taskId),
    actor: str(a.membershipId) ? { membershipId: str(a.membershipId), name: str(a.name, "Someone") } : null,
    summary: str(r.summary), metadata, createdAt: str(r.createdAt),
  };
}

export function mapOrgMembership(raw: unknown): OrgMembership | null {
  const r = rec(raw);
  if (!str(r.id)) return null;
  return { id: str(r.id), role: oneOf(ROLES, r.role, "TEAM_MEMBER"), permissions: Array.isArray(r.permissions) ? r.permissions.filter((p): p is string => typeof p === "string") : [] };
}

export function mapPreference(raw: unknown): NotificationPreference {
  const r = rec(raw);
  return { id: str(r.id), notificationType: str(r.notificationType), inAppEnabled: r.inAppEnabled === true, emailEnabled: r.emailEnabled === true };
}
