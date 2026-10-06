import { api, apiGetRaw } from "../client";
import { normalizePage, type Paginated } from "../pagination";
import {
  mapComment, mapInvitation, mapInvitationPreview, mapMembership, mapNotification, mapOrganization,
  mapPreference, mapProject, mapProjectMember, mapProjectTeam, mapSprint, mapTask, mapTaskCollaborator,
  mapTeam, mapTeamMember, mapUser, pick, pickArray,
} from "../mappers";
import type {
  AppNotification, Comment, Invitation, InvitationPreview, Membership, NotificationPreference, Organization,
  Project, ProjectMember, ProjectTeam, Role, AssignableRole, Sprint, Task, TaskCollaborator, Team, TeamMember, User,
} from "@/types/domain";

/** Query params the backend list endpoints accept (see each *.validation.ts). Max `limit` is 100. */
export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  sprintId?: string;
  assigneeMembershipId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

async function list<T>(path: string, key: string, params: ListParams & { unreadOnly?: boolean }, map: (r: unknown) => T): Promise<Paginated<T>> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const body = await apiGetRaw(path, { ...params, page, limit });
  const p = normalizePage<unknown>(body, key, { page, limit });
  return { items: p.items.map(map), meta: p.meta };
}

const org = (id: string) => `/organizations/${id}`;
const proj = (o: string, p: string) => `${org(o)}/projects/${p}`;
const task = (o: string, p: string, t: string) => `${proj(o, p)}/tasks/${t}`;

// ---- Auth: register/login -> { accessToken, user }, me -> { user }, refresh -> { accessToken } ----
export interface AuthResult { accessToken: string; user: User | null }
function mapAuth(raw: unknown): AuthResult {
  const token = pick(raw, "accessToken");
  const user = pick(raw, "user");
  return { accessToken: typeof token === "string" ? token : "", user: user ? mapUser(user) : null };
}
export const authApi = {
  register: async (b: { name: string; email: string; password: string }) => mapAuth(await api.post<unknown>("/auth/register", b, { anonymous: true })),
  login: async (b: { email: string; password: string }) => mapAuth(await api.post<unknown>("/auth/login", b, { anonymous: true })),
  me: async () => mapUser(pick(await api.get<unknown>("/auth/me"), "user")),
  logout: () => api.post<void>("/auth/logout", undefined, { anonymous: true }),
  logoutAll: () => api.post<void>("/auth/logout-all"),
};

// ---- Organizations ----
export const orgApi = {
  list: (p: ListParams = {}) => list(`/organizations`, "organizations", p, mapOrganization),
  get: async (id: string) => mapOrganization(pick(await api.get<unknown>(org(id)), "organization")),
  create: async (name: string) => mapOrganization(pick(await api.post<unknown>(`/organizations`, { name }), "organization")),
  update: async (id: string, b: { name?: string }) => mapOrganization(pick(await api.patch<unknown>(org(id), b), "organization")),
  remove: (id: string) => api.delete(org(id)),
};

// ---- Members & invitations ----
export const memberApi = {
  list: (o: string, p: ListParams = {}) => list(`${org(o)}/members`, "members", p, mapMembership),
  updateRole: async (o: string, m: string, role: AssignableRole): Promise<Membership> => mapMembership(pick(await api.patch<unknown>(`${org(o)}/members/${m}/role`, { role }), "member")),
  remove: (o: string, m: string) => api.delete(`${org(o)}/members/${m}`),
};
export interface CreatedInvitation { invitation: Invitation; inviteToken: string | null }
export const invitationApi = {
  list: (o: string, p: ListParams = {}) => list(`${org(o)}/invitations`, "invitations", p, mapInvitation),
  create: async (o: string, b: { email: string; role: AssignableRole }): Promise<CreatedInvitation> => {
    const data = await api.post<unknown>(`${org(o)}/invitations`, b);
    const token = pick(data, "inviteToken");
    return { invitation: mapInvitation(pick(data, "invitation")), inviteToken: typeof token === "string" ? token : null };
  },
  revoke: (o: string, i: string) => api.delete(`${org(o)}/invitations/${i}`),
  preview: async (token: string): Promise<InvitationPreview> => mapInvitationPreview(pick(await api.get<unknown>(`/invitations/${token}`), "invitation")),
  accept: (token: string) => api.post<unknown>(`/invitations/${token}/accept`),
};

// ---- Teams ----
export const teamApi = {
  list: (o: string, p: ListParams = {}) => list(`${org(o)}/teams`, "teams", p, mapTeam),
  get: async (o: string, t: string) => mapTeam(pick(await api.get<unknown>(`${org(o)}/teams/${t}`), "team")),
  create: async (o: string, b: { name: string; description?: string }) => mapTeam(pick(await api.post<unknown>(`${org(o)}/teams`, b), "team")),
  update: async (o: string, t: string, b: { name?: string; description?: string }) => mapTeam(pick(await api.patch<unknown>(`${org(o)}/teams/${t}`, b), "team")),
  remove: (o: string, t: string) => api.delete(`${org(o)}/teams/${t}`),
  members: async (o: string, t: string): Promise<TeamMember[]> => pickArray(await api.get<unknown>(`${org(o)}/teams/${t}/members`), "members").map(mapTeamMember),
  addMember: async (o: string, t: string, membershipId: string) => mapTeamMember(pick(await api.post<unknown>(`${org(o)}/teams/${t}/members`, { membershipId }), "member")),
  removeMember: (o: string, t: string, id: string) => api.delete(`${org(o)}/teams/${t}/members/${id}`),
};

// ---- Projects ----
export interface ProjectInput { name?: string; description?: string; status?: string; startDate?: string; dueDate?: string }
export const projectApi = {
  list: (o: string, p: ListParams = {}) => list(`${org(o)}/projects`, "projects", p, mapProject),
  get: async (o: string, p: string) => mapProject(pick(await api.get<unknown>(proj(o, p)), "project")),
  create: async (o: string, b: ProjectInput & { name: string }) => mapProject(pick(await api.post<unknown>(`${org(o)}/projects`, b), "project")),
  update: async (o: string, p: string, b: ProjectInput) => mapProject(pick(await api.patch<unknown>(proj(o, p), b), "project")),
  remove: (o: string, p: string) => api.delete(proj(o, p)),
  teams: async (o: string, p: string): Promise<ProjectTeam[]> => pickArray(await api.get<unknown>(`${proj(o, p)}/teams`), "teams").map(mapProjectTeam),
  assignTeam: async (o: string, p: string, teamId: string) => mapProjectTeam(pick(await api.post<unknown>(`${proj(o, p)}/teams`, { teamId }), "projectTeam")),
  unassignTeam: (o: string, p: string, id: string) => api.delete(`${proj(o, p)}/teams/${id}`),
  members: async (o: string, p: string): Promise<ProjectMember[]> => pickArray(await api.get<unknown>(`${proj(o, p)}/members`), "members").map(mapProjectMember),
  addMember: async (o: string, p: string, membershipId: string) => mapProjectMember(pick(await api.post<unknown>(`${proj(o, p)}/members`, { membershipId }), "member")),
  removeMember: (o: string, p: string, id: string) => api.delete(`${proj(o, p)}/members/${id}`),
};

// ---- Sprints ----
export interface SprintInput { name: string; goal?: string; startDate: string; endDate: string }
export const sprintApi = {
  list: (o: string, p: string, q: ListParams = {}) => list(`${proj(o, p)}/sprints`, "sprints", q, mapSprint),
  create: async (o: string, p: string, b: SprintInput) => mapSprint(pick(await api.post<unknown>(`${proj(o, p)}/sprints`, b), "sprint")),
  update: async (o: string, p: string, s: string, b: Partial<SprintInput>) => mapSprint(pick(await api.patch<unknown>(`${proj(o, p)}/sprints/${s}`, b), "sprint")),
  start: async (o: string, p: string, s: string) => mapSprint(pick(await api.post<unknown>(`${proj(o, p)}/sprints/${s}/start`), "sprint")),
  complete: async (o: string, p: string, s: string) => mapSprint(pick(await api.post<unknown>(`${proj(o, p)}/sprints/${s}/complete`), "sprint")),
  remove: (o: string, p: string, s: string) => api.delete(`${proj(o, p)}/sprints/${s}`),
};

// ---- Tasks ----
export interface TaskInput { title: string; description?: string; priority?: string; status?: string; sprintId?: string | null; assigneeMembershipId?: string | null; dueDate?: string }
export const taskApi = {
  list: (o: string, p: string, q: ListParams = {}) => list(`${proj(o, p)}/tasks`, "tasks", q, mapTask),
  get: async (o: string, p: string, t: string) => mapTask(pick(await api.get<unknown>(task(o, p, t)), "task")),
  create: async (o: string, p: string, b: TaskInput) => mapTask(pick(await api.post<unknown>(`${proj(o, p)}/tasks`, b), "task")),
  update: async (o: string, p: string, t: string, b: Partial<TaskInput>) => mapTask(pick(await api.patch<unknown>(task(o, p, t), b), "task")),
  remove: (o: string, p: string, t: string) => api.delete(task(o, p, t)),
  subtasks: async (o: string, p: string, t: string): Promise<Task[]> => pickArray(await api.get<unknown>(`${task(o, p, t)}/subtasks`), "subtasks").map(mapTask),
  createSubtask: async (o: string, p: string, t: string, title: string) => mapTask(pick(await api.post<unknown>(`${task(o, p, t)}/subtasks`, { title }), "subtask")),
  collaborators: async (o: string, p: string, t: string): Promise<TaskCollaborator[]> => pickArray(await api.get<unknown>(`${task(o, p, t)}/collaborators`), "collaborators").map(mapTaskCollaborator),
  addCollaborator: async (o: string, p: string, t: string, membershipId: string) => mapTaskCollaborator(pick(await api.post<unknown>(`${task(o, p, t)}/collaborators`, { membershipId }), "collaborator")),
  removeCollaborator: (o: string, p: string, t: string, id: string) => api.delete(`${task(o, p, t)}/collaborators/${id}`),
};

// ---- Comments ----
export const commentApi = {
  list: (o: string, p: string, t: string, q: ListParams = {}) => list(`${task(o, p, t)}/comments`, "comments", q, mapComment),
  create: async (o: string, p: string, t: string, b: { content: string; mentionedMembershipIds?: string[] }): Promise<Comment> =>
    mapComment(pick(await api.post<unknown>(`${task(o, p, t)}/comments`, b), "comment")),
  update: async (o: string, p: string, t: string, c: string, content: string) => mapComment(pick(await api.patch<unknown>(`${task(o, p, t)}/comments/${c}`, { content }), "comment")),
  remove: (o: string, p: string, t: string, c: string) => api.delete(`${task(o, p, t)}/comments/${c}`),
};

// ---- Notifications ----
export const notificationApi = {
  list: (o: string, q: ListParams & { unreadOnly?: boolean } = {}) => list<AppNotification>(`${org(o)}/notifications`, "notifications", q, mapNotification),
  markRead: (o: string, id: string) => api.patch<unknown>(`${org(o)}/notifications/${id}/read`),
  markAllRead: (o: string) => api.post<unknown>(`${org(o)}/notifications/read-all`),
  preferences: async (o: string): Promise<NotificationPreference[]> => pickArray(await api.get<unknown>(`${org(o)}/notifications/preferences`), "preferences").map(mapPreference),
  updatePreference: async (o: string, notificationType: string, b: { emailEnabled?: boolean; inAppEnabled?: boolean }) =>
    mapPreference(pick(await api.put<unknown>(`${org(o)}/notifications/preferences/${notificationType}`, b), "preference")),
};

export type { Organization, Membership, Invitation, Team, Project, Sprint, Role };
