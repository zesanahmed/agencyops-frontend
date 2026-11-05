import { portalApi, portalGetRaw } from "../portal-client";
import { mapPortalContact, mapPortalProject, mapPortalTask, mapProjectUpdate, pick, pickArray } from "../mappers";
import { normalizePage, type Paginated } from "../pagination";
import type { PortalContact, PortalProject, PortalTask, ProjectUpdate } from "@/types/domain";

async function list<T>(path: string, key: string, params: { page?: number; limit?: number } & Record<string, string | number | undefined>, map: (r: unknown) => T): Promise<Paginated<T>> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const body = await portalGetRaw(path, { ...params, page, limit });
  const p = normalizePage<unknown>(body, key, { page, limit });
  return { items: p.items.map(map), meta: p.meta };
}

export interface PortalAuthResult { accessToken: string; contact: PortalContact | null }
function mapAuth(raw: unknown): PortalAuthResult {
  const token = pick(raw, "accessToken");
  if (typeof token !== "string" || !token) throw new Error("Sign-in response had no access token");
  const c = pick(raw, "contact");
  return { accessToken: token, contact: c ? mapPortalContact(c) : null };
}

/** The client portal's authentication (separate from /auth). */
export const portalAuthApi = {
  /** `organizationSlug` is the agency's slug, e.g. "brightline-studio". */
  login: async (b: { organizationSlug: string; email: string; password: string }) => mapAuth(await portalApi.post<unknown>("/portal/auth/login", b, { anonymous: true })),
  /** Sets the contact's password from the one-time e-mailed token and signs them in. */
  acceptInvite: async (b: { token: string; password: string }) => mapAuth(await portalApi.post<unknown>("/portal/auth/accept-invite", b, { anonymous: true })),
  me: async (): Promise<PortalContact> => mapPortalContact(pick(await portalApi.get<unknown>("/portal/auth/me"), "contact")),
  logout: () => portalApi.post<void>("/portal/auth/logout", undefined, { anonymous: true }),
  logoutAll: () => portalApi.post<void>("/portal/auth/logout-all"),
};

/** What the signed-in contact may see. Every project route is gated by an explicit per-project grant on the server. */
export const portalProjectsApi = {
  list: async (): Promise<PortalProject[]> => pickArray(await portalApi.get<unknown>("/portal/projects"), "projects").map(mapPortalProject),
  get: async (id: string): Promise<PortalProject> => mapPortalProject(pick(await portalApi.get<unknown>(`/portal/projects/${id}`), "project")),
  updates: (id: string, p: { page?: number; limit?: number } = {}) => list<ProjectUpdate>(`/portal/projects/${id}/updates`, "updates", p, mapProjectUpdate),
  tasks: (id: string, p: { page?: number; limit?: number; status?: string } = {}) => list<PortalTask>(`/portal/projects/${id}/tasks`, "tasks", p, mapPortalTask),
};
