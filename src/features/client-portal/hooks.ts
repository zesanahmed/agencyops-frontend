"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collabApi, type RequestListParams } from "@/lib/api/services";
import { qk } from "@/lib/query-keys";
import { useAction } from "@/lib/use-action";
import { useAuthStore } from "@/stores/auth-store";
import type { UploadHandlers } from "@/components/shared/file-uploader";

const useAuthed = () => useAuthStore((s) => s.status === "authenticated");
const portalKey = (o: string, p: string) => ["organizations", o, "client-portal", p] as const;
type Page = { page?: number; limit?: number };

export function useProjectUpdates(o: string, p: string, params: Page) {
  const authed = useAuthed();
  return useQuery({ queryKey: qk.clientPortal(o, p, "updates", params), queryFn: () => collabApi.updates(o, p, params), enabled: authed, placeholderData: (x) => x });
}
export function useProjectMessages(o: string, p: string, params: Page) {
  const authed = useAuthed();
  return useQuery({ queryKey: qk.clientPortal(o, p, "messages", params), queryFn: () => collabApi.messages(o, p, params), enabled: authed, placeholderData: (x) => x });
}
export function useProjectFiles(o: string, p: string, params: Page) {
  const authed = useAuthed();
  return useQuery({ queryKey: qk.clientPortal(o, p, "files", params), queryFn: () => collabApi.files(o, p, params), enabled: authed, placeholderData: (x) => x });
}
/** Org-wide inbox; pass `projectId` to narrow it to one project. */
export function useClientRequests(o: string, params: RequestListParams) {
  const authed = useAuthed();
  return useQuery({ queryKey: qk.clientRequests(o, params), queryFn: () => collabApi.requests(o, params), enabled: authed, placeholderData: (x) => x });
}

export const usePostUpdate = (o: string, p: string) => useAction({ fn: (v: { title: string; body: string }) => collabApi.postUpdate(o, p, v), invalidate: [portalKey(o, p)], success: "Update posted" });
export const useDeleteUpdate = (o: string, p: string) => useAction({ fn: (id: string) => collabApi.deleteUpdate(o, p, id), invalidate: [portalKey(o, p)], success: "Update deleted" });
export const usePostMessage = (o: string, p: string) => useAction({ fn: (content: string) => collabApi.postMessage(o, p, content), invalidate: [portalKey(o, p)] });
export const useDeleteMessage = (o: string, p: string) => useAction({ fn: (id: string) => collabApi.deleteMessage(o, p, id), invalidate: [portalKey(o, p)], success: "Message deleted" });
export const useDeleteSharedFile = (o: string, p: string) => useAction({ fn: (id: string) => collabApi.deleteFile(o, p, id), invalidate: [portalKey(o, p)], success: "File removed" });
/** Not a mutation hook: FileUploader owns progress/cancel/error display; this refreshes the lists once the upload lands. */
export function useUploadSharedFile(o: string, p: string) {
  const qc = useQueryClient();
  return async (file: File, h: UploadHandlers) => {
    const uploaded = await collabApi.uploadFile(o, p, file, { onProgress: h.onProgress, signal: h.signal });
    await qc.invalidateQueries({ queryKey: portalKey(o, p) });
    return uploaded;
  };
}
export const useUpdateRequest = (o: string) =>
  useAction({ fn: (v: { id: string; status?: string; resolutionNote?: string | null }) => collabApi.updateRequest(o, v.id, { ...(v.status ? { status: v.status } : {}), ...(v.resolutionNote !== undefined ? { resolutionNote: v.resolutionNote } : {}) }), invalidate: [["organizations", o, "client-portal"]], success: "Request updated" });
