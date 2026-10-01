/**
 * Domain types derived from the CURRENT contract. Fields the contract does not
 * document are optional so the UI degrades instead of crashing. Tighten after
 * running `npm run probe:api` against the live backend.
 */
export type Role = "OWNER" | "MANAGER" | "TEAM_MEMBER";
export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "BLOCKED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type SprintStatus = "PLANNED" | "ACTIVE" | "COMPLETED";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  /** Caller's role, when the list endpoint provides it. */
  role?: Role;
  createdAt?: string;
}

export interface Membership {
  id: string;
  role: Role;
  userId?: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  status?: string;
  expiresAt?: string;
  createdAt?: string;
  /** Returned on create only (no email delivery yet). */
  inviteToken?: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  memberCount?: number;
  createdAt?: string;
}

export interface TeamMember {
  id: string;
  membershipId: string;
  name: string;
  email: string;
  role?: Role;
}

export interface Project {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Sprint {
  id: string;
  name: string;
  goal?: string | null;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  assigneeMembershipId?: string | null;
  assigneeName?: string | null;
  parentTaskId?: string | null;
  dueDate?: string | null;
  createdAt?: string;
}

export interface Comment {
  id: string;
  content: string;
  authorName: string;
  authorMembershipId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body?: string;
  readAt?: string | null;
  createdAt?: string;
}

export interface NotificationPreference {
  type: string;
  emailEnabled: boolean;
  inAppEnabled?: boolean;
}
