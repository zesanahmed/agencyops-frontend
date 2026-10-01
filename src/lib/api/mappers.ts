import type {
  AppNotification, Comment, Invitation, Membership, NotificationPreference, Organization, Project,
  Role, Sprint, Task, Team, TeamMember, User,
} from "@/types/domain";

/**
 * Tolerant mappers. The backend response shapes are unverified, so each mapper
 * reads the most likely field names and falls back safely. They exist in ONE
 * place so a verified contract means editing this file, not every page.
 */
type R = Record<string, unknown>;
const rec = (v: unknown): R => (typeof v === "object" && v !== null ? (v as R) : {});
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const ROLES: Role[] = ["OWNER", "MANAGER", "TEAM_MEMBER"];
export const asRole = (v: unknown): Role | undefined => (ROLES.includes(v as Role) ? (v as Role) : undefined);

function person(raw: R): { name: string; email: string; userId?: string } {
  const u = rec(raw.user);
  return {
    name: str(u.name) ?? str(raw.name) ?? str(raw.userName) ?? str(u.email) ?? str(raw.email) ?? "Unknown member",
    email: str(u.email) ?? str(raw.email) ?? "",
    userId: str(u.id) ?? str(raw.userId),
  };
}

export function mapUser(raw: unknown): User {
  const r = rec(raw);
  const u = rec(r.user ?? raw);
  return { id: str(u.id) ?? "", name: str(u.name) ?? "", email: str(u.email) ?? "" };
}

export function mapOrganization(raw: unknown): Organization {
  const r = rec(raw);
  const o = rec(r.organization ?? raw);
  return {
    id: str(o.id) ?? str(r.organizationId) ?? "",
    name: str(o.name) ?? "Untitled organization",
    slug: str(o.slug),
    role: asRole(r.role) ?? asRole(o.role) ?? asRole(rec(r.membership).role),
    createdAt: str(o.createdAt),
  };
}

export function mapMembership(raw: unknown): Membership {
  const r = rec(raw);
  return { id: str(r.id) ?? "", role: asRole(r.role) ?? "TEAM_MEMBER", createdAt: str(r.createdAt), ...person(r) };
}

export function mapInvitation(raw: unknown): Invitation {
  const r = rec(raw);
  return {
    id: str(r.id) ?? "",
    email: str(r.email) ?? "",
    role: asRole(r.role) ?? "TEAM_MEMBER",
    status: str(r.status),
    expiresAt: str(r.expiresAt),
    createdAt: str(r.createdAt),
    inviteToken: str(r.inviteToken) ?? str(r.token),
  };
}

export function mapTeam(raw: unknown): Team {
  const r = rec(raw);
  const count = typeof r.memberCount === "number" ? r.memberCount : typeof rec(r._count).members === "number" ? (rec(r._count).members as number) : undefined;
  return { id: str(r.id) ?? "", name: str(r.name) ?? "Untitled team", description: str(r.description) ?? null, memberCount: count, createdAt: str(r.createdAt) };
}

export function mapTeamMember(raw: unknown): TeamMember {
  const r = rec(raw);
  const m = rec(r.membership);
  return {
    id: str(r.id) ?? "",
    membershipId: str(r.membershipId) ?? str(m.id) ?? "",
    role: asRole(m.role) ?? asRole(r.role),
    ...person(Object.keys(m).length ? m : r),
  };
}

export function mapProject(raw: unknown): Project {
  const r = rec(raw);
  return {
    id: str(r.id) ?? "",
    name: str(r.name) ?? "Untitled project",
    slug: str(r.slug),
    description: str(r.description) ?? null,
    status: str(r.status) ?? "ACTIVE",
    createdAt: str(r.createdAt),
    updatedAt: str(r.updatedAt),
  };
}

export function mapSprint(raw: unknown): Sprint {
  const r = rec(raw);
  return {
    id: str(r.id) ?? "",
    name: str(r.name) ?? "Sprint",
    goal: str(r.goal) ?? null,
    status: str(r.status) ?? "PLANNED",
    startDate: str(r.startDate) ?? null,
    endDate: str(r.endDate) ?? null,
  };
}

export function mapTask(raw: unknown): Task {
  const r = rec(raw);
  const a = rec(r.assignee);
  return {
    id: str(r.id) ?? "",
    title: str(r.title) ?? "Untitled task",
    description: str(r.description) ?? null,
    status: str(r.status) ?? "TODO",
    priority: str(r.priority) ?? "MEDIUM",
    assigneeMembershipId: str(r.assigneeMembershipId) ?? str(a.id) ?? null,
    assigneeName: str(rec(a.user).name) ?? str(a.name) ?? str(r.assigneeName) ?? null,
    parentTaskId: str(r.parentTaskId) ?? null,
    dueDate: str(r.dueDate) ?? null,
    createdAt: str(r.createdAt),
  };
}

export function mapComment(raw: unknown): Comment {
  const r = rec(raw);
  const a = rec(r.author);
  return {
    id: str(r.id) ?? "",
    content: str(r.content) ?? "",
    authorName: str(rec(a.user).name) ?? str(a.name) ?? str(r.authorName) ?? "Unknown member",
    authorMembershipId: str(r.authorMembershipId) ?? str(a.id),
    createdAt: str(r.createdAt),
    updatedAt: str(r.updatedAt),
  };
}

export function mapNotification(raw: unknown): AppNotification {
  const r = rec(raw);
  return {
    id: str(r.id) ?? "",
    type: str(r.type) ?? "GENERAL",
    title: str(r.title) ?? str(r.message) ?? "Notification",
    body: str(r.body) ?? str(r.content),
    readAt: str(r.readAt) ?? null,
    createdAt: str(r.createdAt),
  };
}

export function mapPreference(raw: unknown): NotificationPreference {
  const r = rec(raw);
  return {
    type: str(r.type) ?? "",
    emailEnabled: r.emailEnabled === true,
    inAppEnabled: typeof r.inAppEnabled === "boolean" ? r.inAppEnabled : undefined,
  };
}

export const asArray = (v: unknown): unknown[] => {
  if (Array.isArray(v)) return v;
  const d = rec(v);
  for (const k of ["items", "data", "results"]) if (Array.isArray(d[k])) return d[k] as unknown[];
  return [];
};
