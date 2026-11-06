"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { portalInvoicesApi, portalProjectsApi } from "@/lib/api/services";
import { useAction } from "@/lib/use-action";
import type { UploadHandlers } from "@/components/shared/file-uploader";
import { usePortalAuthStore } from "@/stores/portal-auth-store";

const usePortalAuthed = () => usePortalAuthStore((s) => s.status === "authenticated");

/** Every portal query key starts with "portal" so signing out can drop exactly the portal's cache. */
export const pqk = {
  projects: ["portal", "projects"] as const,
  project: (id: string) => ["portal", "projects", id] as const,
  tasks: (id: string, p: object) => ["portal", "projects", id, "tasks", p] as const,
  updates: (id: string, p: object) => ["portal", "projects", id, "updates", p] as const,
  messages: (id: string, p: object) => ["portal", "projects", id, "messages", p] as const,
  requests: (id: string, p: object) => ["portal", "projects", id, "requests", p] as const,
  files: (id: string, p: object) => ["portal", "projects", id, "files", p] as const,
  invoices: (p: object) => ["portal", "invoices", p] as const,
  invoice: (id: string) => ["portal", "invoices", id] as const,
};

export function usePortalProjects() {
  const authed = usePortalAuthed();
  return useQuery({ queryKey: pqk.projects, queryFn: () => portalProjectsApi.list(), enabled: authed });
}
export function usePortalProject(id: string) {
  const authed = usePortalAuthed();
  return useQuery({ queryKey: pqk.project(id), queryFn: () => portalProjectsApi.get(id), enabled: authed });
}
export function usePortalTasks(id: string, params: { page?: number; limit?: number; status?: string }) {
  const authed = usePortalAuthed();
  return useQuery({ queryKey: pqk.tasks(id, params), queryFn: () => portalProjectsApi.tasks(id, params), enabled: authed, placeholderData: (p) => p });
}
export function usePortalUpdates(id: string, params: { page?: number; limit?: number }) {
  const authed = usePortalAuthed();
  return useQuery({ queryKey: pqk.updates(id, params), queryFn: () => portalProjectsApi.updates(id, params), enabled: authed, placeholderData: (p) => p });
}

type Page = { page?: number; limit?: number };
export function usePortalMessages(id: string, params: Page) {
  const authed = usePortalAuthed();
  return useQuery({ queryKey: pqk.messages(id, params), queryFn: () => portalProjectsApi.messages(id, params), enabled: authed, placeholderData: (p) => p });
}
export function usePortalRequests(id: string, params: Page) {
  const authed = usePortalAuthed();
  return useQuery({ queryKey: pqk.requests(id, params), queryFn: () => portalProjectsApi.requests(id, params), enabled: authed, placeholderData: (p) => p });
}
export function usePortalFiles(id: string, params: Page) {
  const authed = usePortalAuthed();
  return useQuery({ queryKey: pqk.files(id, params), queryFn: () => portalProjectsApi.files(id, params), enabled: authed, placeholderData: (p) => p });
}
export function usePortalInvoices(params: Page) {
  const authed = usePortalAuthed();
  return useQuery({ queryKey: pqk.invoices(params), queryFn: () => portalInvoicesApi.list(params), enabled: authed, placeholderData: (p) => p });
}
export function usePortalInvoice(id: string) {
  const authed = usePortalAuthed();
  return useQuery({ queryKey: pqk.invoice(id), queryFn: () => portalInvoicesApi.get(id), enabled: authed });
}

const projectKey = (id: string) => ["portal", "projects", id] as const;
export const usePostPortalMessage = (id: string) => useAction({ fn: (content: string) => portalProjectsApi.postMessage(id, content), invalidate: [projectKey(id)] });
export const useCreatePortalRequest = (id: string) =>
  useAction({ fn: (v: { type: string; title: string; description: string }) => portalProjectsApi.createRequest(id, v), invalidate: [projectKey(id)], success: "Request sent to your agency" });
/** FileUploader owns progress/cancel/error UI; this refreshes the lists once the upload lands. */
export function useUploadPortalFile(id: string) {
  const qc = useQueryClient();
  return async (file: File, h: UploadHandlers) => {
    const f = await portalProjectsApi.uploadFile(id, file, { onProgress: h.onProgress, signal: h.signal });
    await qc.invalidateQueries({ queryKey: projectKey(id) });
    return f;
  };
}
/** Starts Stripe Checkout; the browser leaves the app, and nothing is marked paid locally. */
export const useStartInvoiceCheckout = (id: string) => useAction({ fn: () => portalInvoicesApi.checkout(id) });
