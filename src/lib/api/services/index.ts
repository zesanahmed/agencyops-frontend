import { api, apiGetRaw } from "../client";
import { normalizePage, type Paginated } from "../pagination";
import {
  asArray, mapComment, mapInvitation, mapMembership, mapNotification, mapOrganization, mapPreference,
  mapProject, mapSprint, mapTask, mapTeam, mapTeamMember, mapUser,
} from "../mappers";
import type {
  AppNotification, Comment, Invitation, Membership, NotificationPreference, Organization, Project,
  Role, Sprint, Task, Team, TeamMember, User,
} from "@/types/domain";

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

async function list<T>(path: string, params: ListParams & { unreadOnly?: boolean }, map: (r: unknown) => T): Promise<Paginated<T>> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const body = await apiGetRaw(path, { ...params, page, limit });
  const p = normalizePage<unknown>(body, { page, limit });
  return { items: p.items.map(map), meta: p.meta };
}

const org = (id: string) => `/organizations/${id}`;
const proj = (o: string, p: string) => `${org(o)}/projects/${p}`;
const task = (o: string, p: string, t: string) => `${proj(o, p)}/tasks/${t}`;

// ---- Auth ----
export interface AuthResult { accessToken: string; user: User | null }
function mapAuth(raw: unknown): AuthResult {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const token = typeof r.accessToken === "string" ? r.accessToken : "";
  const user = r.user ? mapUser(r.user) : null;
  return { accessToken: token, user };
}
export const authApi = {
  register: async (b: { name: string; email: string; password: string }) =>
    mapAuth(await api.post<unknown>("/auth/register", b, { anonymous: true })),
  login: async (b: { email: string; password: string }) =>
    mapAuth(await api.post<unknown>("/auth/login", b, { anonymous: true })),
  me: async () => mapUser(await api.get<unknown>("/auth/me")),
  logout: () => api.post<void>("/auth/logout", undefined, { anonymous: true }),
  logoutAll: () => api.post<void>("/auth/logout-all"),
};

// ---- Organizations ----
export const orgApi = {
  list: (p: ListParams = {}) => list(`/organizations`, p, mapOrganization),
  get: async (id: string) => mapOrganization(await api.get<unknown>(org(id))),
  create: async (name: string) => mapOrganization(await api.post<unknown>(`/organizations`, { name })),
  update: async (id: string, name: string) => mapOrganization(await api.patch<unknown>(org(id), { name })),
  remove: (id: string) => api.delete(org(id)),
};

// ---- Members & invitations ----
export const memberApi = {
  list: (o: string, p: ListParams = {}) => list(`${org(o)}/members`, p, mapMembership),
  updateRole: (o: string, m: string, role: Role) => api.patch<unknown>(`${org(o)}/members/${m}/role`, { role }),
  remove: (o: string, m: string) => api.delete(`${org(o)}/members/${m}`),
};
export const invitationApi = {
  list: (o: string, p: ListParams = {}) => list(`${org(o)}/invitations`, p, mapInvitation),
  create: async (o: string, b: { email: string; role: Role }) =>
    mapInvitation(await api.post<unknown>(`${org(o)}/invitations`, b)),
  revoke: (o: string, i: string) => api.delete(`${org(o)}/invitations/${i}`),
  preview: async (token: string) => api.get<unknown>(`/invitations/${token}`),
  accept: (token: string) => api.post<unknown>(`/invitations/${token}/accept`),
};

// ---- Teams ----
export const teamApi = {
  list: (o: string, p: ListParams = {}) => list(`${org(o)}/teams`, p, mapTeam),
  get: async (o: string, t: string) => mapTeam(await api.get<unknown>(`${org(o)}/teams/${t}`)),
  create: async (o: string, b: { name: string; description?: string }) => mapTeam(await api.post<unknown>(`${org(o)}/teams`, b)),
  update: async (o: string, t: string, b: { name?: string; description?: string }) => mapTeam(await api.patch<unknown>(`${org(o)}/teams/${t}`, b)),
  remove: (o: string, t: string) => api.delete(`${org(o)}/teams/${t}`),
  members: async (o: string, t: string): Promise<TeamMember[]> => asArray(await api.get<unknown>(`${org(o)}/teams/${t}/members`)).map(mapTeamMember),
  addMember: (o: string, t: string, membershipId: string) => api.post<unknown>(`${org(o)}/teams/${t}/members`, { membershipId }),
  removeMember: (o: string, t: string, id: string) => api.delete(`${org(o)}/teams/${t}/members/${id}`),
};

// ---- Projects ----
export const projectApi = {
  list: (o: string, p: ListParams = {}) => list(`${org(o)}/projects`, p, mapProject),
  get: async (o: string, p: string) => mapProject(await api.get<unknown>(proj(o, p))),
  create: async (o: string, b: { name: string; description?: string }) => mapProject(await api.post<unknown>(`${org(o)}/projects`, b)),
  update: async (o: string, p: string, b: { name?: string; description?: string; status?: string }) => mapProject(await api.patch<unknown>(proj(o, p), b)),
  remove: (o: string, p: string) => api.delete(proj(o, p)),
  teams: async (o: string, p: string) => asArray(await api.get<unknown>(`${proj(o, p)}/teams`)),
  assignTeam: (o: string, p: string, teamId: string) => api.post<unknown>(`${proj(o, p)}/teams`, { teamId }),
  unassignTeam: (o: string, p: string, id: string) => api.delete(`${proj(o, p)}/teams/${id}`),
  members: async (o: string, p: string): Promise<TeamMember[]> => asArray(await api.get<unknown>(`${proj(o, p)}/members`)).map(mapTeamMember),
  addMember: (o: string, p: string, membershipId: string) => api.post<unknown>(`${proj(o, p)}/members`, { membershipId }),
  removeMember: (o: string, p: string, id: string) => api.delete(`${proj(o, p)}/members/${id}`),
};

// ---- Sprints ----
export interface SprintInput { name: string; goal?: string; startDate?: string; endDate?: string }
export const sprintApi = {
  list: (o: string, p: string, q: ListParams = {}) => list(`${proj(o, p)}/sprints`, q, mapSprint),
  create: async (o: string, p: string, b: SprintInput) => mapSprint(await api.post<unknown>(`${proj(o, p)}/sprints`, b)),
  update: async (o: string, p: string, s: string, b: Partial<SprintInput>) => mapSprint(await api.patch<unknown>(`${proj(o, p)}/sprints/${s}`, b)),
  start: (o: string, p: string, s: string) => api.post<unknown>(`${proj(o, p)}/sprints/${s}/start`),
  complete: (o: string, p: string, s: string) => api.post<unknown>(`${proj(o, p)}/sprints/${s}/complete`),
  remove: (o: string, p: string, s: string) => api.delete(`${proj(o, p)}/sprints/${s}`),
};

// ---- Tasks ----
export interface TaskInput { title: string; description?: string; priority?: string; assigneeMembershipId?: string }
export const taskApi = {
  list: (o: string, p: string, q: ListParams = {}) => list(`${proj(o, p)}/tasks`, q, mapTask),
  get: async (o: string, p: string, t: string) => mapTask(await api.get<unknown>(task(o, p, t))),
  create: async (o: string, p: string, b: TaskInput) => mapTask(await api.post<unknown>(`${proj(o, p)}/tasks`, b)),
  update: async (o: string, p: string, t: string, b: Partial<TaskInput> & { status?: string }) => mapTask(await api.patch<unknown>(task(o, p, t), b)),
  remove: (o: string, p: string, t: string) => api.delete(task(o, p, t)),
  subtasks: async (o: string, p: string, t: string): Promise<Task[]> => asArray(await api.get<unknown>(`${task(o, p, t)}/subtasks`)).map(mapTask),
  createSubtask: async (o: string, p: string, t: string, title: string) => mapTask(await api.post<unknown>(`${task(o, p, t)}/subtasks`, { title })),
  collaborators: async (o: string, p: string, t: string): Promise<TeamMember[]> => asArray(await api.get<unknown>(`${task(o, p, t)}/collaborators`)).map(mapTeamMember),
  addCollaborator: (o: string, p: string, t: string, membershipId: string) => api.post<unknown>(`${task(o, p, t)}/collaborators`, { membershipId }),
  removeCollaborator: (o: string, p: string, t: string, id: string) => api.delete(`${task(o, p, t)}/collaborators/${id}`),
};

// ---- Comments ----
export const commentApi = {
  list: (o: string, p: string, t: string, q: ListParams = {}) => list(`${task(o, p, t)}/comments`, q, mapComment),
  create: async (o: string, p: string, t: string, b: { content: string; mentionedMembershipIds?: string[] }): Promise<Comment> =>
    mapComment(await api.post<unknown>(`${task(o, p, t)}/comments`, b)),
  update: (o: string, p: string, t: string, c: string, content: string) => api.patch<unknown>(`${task(o, p, t)}/comments/${c}`, { content }),
  remove: (o: string, p: string, t: string, c: string) => api.delete(`${task(o, p, t)}/comments/${c}`),
};

// ---- Notifications ----
export const notificationApi = {
  list: (o: string, q: ListParams & { unreadOnly?: boolean } = {}) => list<AppNotification>(`${org(o)}/notifications`, q, mapNotification),
  markRead: (o: string, id: string) => api.patch<unknown>(`${org(o)}/notifications/${id}/read`),
  markAllRead: (o: string) => api.post<unknown>(`${org(o)}/notifications/read-all`),
  preferences: async (o: string): Promise<NotificationPreference[]> => asArray(await api.get<unknown>(`${org(o)}/notifications/preferences`)).map(mapPreference),
  updatePreference: (o: string, type: string, emailEnabled: boolean) => api.put<unknown>(`${org(o)}/notifications/preferences/${type}`, { emailEnabled }),
};

export type { Organization, Membership, Invitation, Team, Project, Sprint };
