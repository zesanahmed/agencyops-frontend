import { portalApi, portalGetRaw, portalUpload } from "../portal-client";
import type { UploadOptions } from "../client";
import { mapPortalContact, mapPortalProject, mapPortalTask, mapProjectUpdate, mapProjectMessage, mapClientRequest, mapSharedFile, mapInvoice, pick, pickArray } from "../mappers";
import { normalizePage, type Paginated } from "../pagination";
import type { ClientRequest, Invoice, PaymentStatus, PortalContact, PortalProject, PortalTask, ProjectMessage, ProjectUpdate, SharedFile } from "@/types/domain";

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
  messages: (id: string, p: { page?: number; limit?: number } = {}) => list<ProjectMessage>(`/portal/projects/${id}/messages`, "messages", p, mapProjectMessage),
  postMessage: async (id: string, content: string) => mapProjectMessage(pick(await portalApi.post<unknown>(`/portal/projects/${id}/messages`, { content }), "message")),
  /** Only the contact's OWN requests are returned. */
  requests: (id: string, p: { page?: number; limit?: number } = {}) => list<ClientRequest>(`/portal/projects/${id}/requests`, "requests", p, mapClientRequest),
  createRequest: async (id: string, b: { type: string; title: string; description: string }) => mapClientRequest(pick(await portalApi.post<unknown>(`/portal/projects/${id}/requests`, b), "request")),
  files: (id: string, p: { page?: number; limit?: number } = {}) => list<SharedFile>(`/portal/projects/${id}/files`, "files", p, mapSharedFile),
  uploadFile: async (id: string, file: File, opts?: UploadOptions) => mapSharedFile(pick(await portalUpload<unknown>(`/portal/projects/${id}/files`, file, opts), "file")),
};

export interface PortalPaymentStatus {
  invoiceStatus: "OPEN" | "PAID" | "VOID" | "DRAFT";
  confirmed: boolean;
  payment: { status: PaymentStatus; failureReason: string | null; paidAt: string | null } | null;
}

/** Invoices visible to the contact: the client's own, never DRAFT, and (when tied to a project) only for granted projects. */
export const portalInvoicesApi = {
  list: (p: { page?: number; limit?: number } = {}) => list<Invoice>("/portal/invoices", "invoices", p, mapInvoice),
  get: async (id: string): Promise<Invoice> => mapInvoice(await portalApi.get<unknown>(`/portal/invoices/${id}`)),
  /** OPEN invoices only (409 otherwise). Returns the Stripe Checkout URL; the amount comes from the server, never from here. */
  checkout: async (id: string): Promise<string> => { const u = pick(await portalApi.post<unknown>(`/portal/invoices/${id}/checkout`), "url"); if (typeof u !== "string" || !u) throw new Error("No checkout URL returned"); return u; },
  /** The backend reads the Checkout session from `session_id` (FRONTEND_CONTRACT §4 says `sessionId`; the code is authoritative). */
  paymentStatus: async (id: string, sessionId?: string): Promise<PortalPaymentStatus> => {
    const d = await portalApi.get<unknown>(`/portal/invoices/${id}/payment-status`, sessionId ? { session_id: sessionId } : undefined);
    const pay = pick(d, "payment");
    const rec = (v: unknown): Record<string, unknown> => (typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {});
    const st = pick(d, "invoiceStatus");
    return {
      invoiceStatus: st === "PAID" || st === "VOID" || st === "DRAFT" ? st : "OPEN",
      confirmed: pick(d, "confirmed") === true,
      payment: pay ? { status: (["PENDING", "SUCCEEDED", "FAILED", "CANCELED"] as const).find((x) => x === rec(pay).status) ?? "PENDING", failureReason: typeof rec(pay).failureReason === "string" ? (rec(pay).failureReason as string) : null, paidAt: typeof rec(pay).paidAt === "string" ? (rec(pay).paidAt as string) : null } : null,
    };
  },
};
