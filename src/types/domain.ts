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
  /** Not reported by the backend yet (it only returns it from the visibility PATCH); mapped when present. */
  clientVisible?: boolean;
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

// ---- Clients (internal side; FRONTEND_CONTRACT / client.mappers.ts) ----
export const CONTACT_STATUSES = ["INVITED", "ACTIVE", "DISABLED"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export interface Client { id: string; name: string; website: string | null; notes: string | null; createdAt: string; updatedAt: string }
export interface ClientContact { id: string; clientOrganizationId: string; name: string; email: string; jobTitle: string | null; status: ContactStatus; lastLoginAt: string | null; createdAt: string }
/** What GET /clients/:id/projects returns: a slim project row, not the full Project. */
export interface ClientProject { id: string; name: string; slug: string; status: ProjectStatus }
/** A contact's access to one linked project. */
export interface ClientAccess { id: string; clientContactId: string; projectId: string; createdAt: string }
/** Contact create/reinvite/enable result. `inviteToken` is only present while the backend has no e-mail delivery configured. */
export interface ContactInviteResult { contact: ClientContact; inviteToken: string | null }

// ---- Invoices & billing ----
export const INVOICE_STATUSES = ["DRAFT", "OPEN", "PAID", "VOID"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export const PAYMENT_STATUSES = ["PENDING", "SUCCEEDED", "FAILED", "CANCELED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface InvoiceItem { description: string; quantity: number; unitAmountCents: number; amountCents: number }
export interface InvoicePayment { id: string; amountCents: number; currency: string; status: PaymentStatus; failureReason: string | null; paidAt: string | null; createdAt: string }
/** Staff view. Amounts are integer cents; `currency` is a lower-case ISO code. */
export interface Invoice {
  id: string; number: string; status: InvoiceStatus; clientId: string; projectId: string | null;
  issueDate: string; dueDate: string; currency: string;
  subtotalCents: number; taxCents: number; discountCents: number; totalCents: number;
  notes: string | null; sentAt: string | null; paidAt: string | null; voidedAt: string | null;
  /** Present once the background worker has rendered the PDF. */
  pdfUrl: string | null; pdfGeneratedAt: string | null; createdAt: string;
  items: InvoiceItem[]; payments: InvoicePayment[];
}

export const PLAN_CODES = ["FREE", "PRO"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];
export interface Billing {
  plan: { code: PlanCode; name: string; maxMembers: number | null; maxProjects: number | null };
  subscription: { status: string | null; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; hasBillingAccount: boolean };
}

// ---- Client collaboration (staff side) & attachments ----
export const REQUEST_TYPES = ["NEW_REQUIREMENT", "CHANGE_REQUEST", "QUESTION", "FEEDBACK", "ISSUE"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];
export const REQUEST_STATUSES = ["OPEN", "IN_REVIEW", "RESOLVED", "REJECTED"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export interface ProjectUpdate { id: string; title: string; body: string; createdAt: string; author: { name: string } }
/** `author.type` says whether a client contact or a staff member wrote it. */
export interface ProjectMessage { id: string; content: string; createdAt: string; author: { type: "CLIENT" | "STAFF"; name: string } }
export interface SharedFile { id: string; originalFilename: string; url: string; mimeType: string; sizeBytes: number; createdAt: string; uploadedBy: { type: "CLIENT" | "STAFF"; name: string } }
export interface ClientRequest {
  id: string; projectId: string; type: RequestType; title: string; description: string; status: RequestStatus;
  resolutionNote: string | null; createdAt: string; updatedAt: string; resolvedAt: string | null;
  /** Staff view only: who raised it. */
  contact?: { id: string; name: string; email: string };
}
export interface TaskAttachment { id: string; taskId: string; uploadedByMembershipId: string; originalFilename: string; url: string; mimeType: string; sizeBytes: number; createdAt: string }

// ---- Client portal (a separate security boundary: contacts, not organization members) ----
export interface PortalContact { id: string; name: string; email: string; jobTitle: string | null; clientOrganizationName: string; organizationName: string }
export interface PortalProgress { totalTasks: number; completedTasks: number; percentComplete: number; byStatus: Partial<Record<TaskStatus, number>> }
export interface PortalProject { id: string; name: string; description: string | null; status: ProjectStatus; startDate: string | null; dueDate: string | null; progress: PortalProgress }
/** What a client may see of a task: no assignee, collaborators, comments or attachments. */
export interface PortalTask { id: string; title: string; description: string | null; status: TaskStatus; priority: TaskPriority; startDate: string | null; dueDate: string | null }
