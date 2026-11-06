"use client";

import { useQuery } from "@tanstack/react-query";
import { clientApi } from "@/lib/api/services";
import { qk } from "@/lib/query-keys";
import { useAction } from "@/lib/use-action";
import { useAuthStore } from "@/stores/auth-store";
import type { ClientValues, ContactValues } from "./schemas";

const useAuthed = () => useAuthStore((s) => s.status === "authenticated");
const orgClients = (o: string) => ["organizations", o, "clients"] as const;

export type ClientListParams = { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: "asc" | "desc" };

export function useClients(o: string, params: ClientListParams) {
  const authed = useAuthed();
  return useQuery({ queryKey: qk.clients(o, params), queryFn: () => clientApi.list(o, params), enabled: authed, placeholderData: (p) => p });
}
export function useClient(o: string, id: string) {
  const authed = useAuthed();
  return useQuery({ queryKey: qk.client(o, id), queryFn: () => clientApi.get(o, id), enabled: authed });
}
export function useClientContacts(o: string, id: string) {
  const authed = useAuthed();
  return useQuery({ queryKey: qk.clientContacts(o, id), queryFn: () => clientApi.contacts(o, id), enabled: authed });
}
export function useClientProjects(o: string, id: string) {
  const authed = useAuthed();
  return useQuery({ queryKey: qk.clientProjects(o, id), queryFn: () => clientApi.projects(o, id), enabled: authed });
}
export function useContactAccess(o: string, id: string, contactId: string, enabled = true) {
  const authed = useAuthed();
  return useQuery({ queryKey: qk.contactAccess(o, id, contactId), queryFn: () => clientApi.access(o, id, contactId), enabled: authed && enabled });
}

/** Blank website/notes are omitted on create and sent as null on update (the backend accepts null to clear them). */
export const useCreateClient = (o: string) =>
  useAction({
    fn: (v: ClientValues) => clientApi.create(o, { name: v.name, ...(v.website ? { website: v.website } : {}), ...(v.notes ? { notes: v.notes } : {}) }),
    invalidate: [orgClients(o)], success: (c) => `${c.name} added`,
  });
export const useUpdateClient = (o: string, id: string) =>
  useAction({ fn: (v: ClientValues) => clientApi.update(o, id, { name: v.name, website: v.website || null, notes: v.notes || null }), invalidate: [orgClients(o)], success: "Client updated" });
export const useDeleteClient = (o: string) =>
  useAction({ fn: (id: string) => clientApi.remove(o, id), invalidate: [orgClients(o)], deferRefetch: true, success: "Client deleted" });

const contacts = (o: string, c: string) => [qk.clientContacts(o, c)];
export const useCreateContact = (o: string, c: string) =>
  useAction({ fn: (v: ContactValues) => clientApi.createContact(o, c, { name: v.name, email: v.email, ...(v.jobTitle ? { jobTitle: v.jobTitle } : {}) }), invalidate: contacts(o, c) });
export const useUpdateContact = (o: string, c: string) =>
  useAction({ fn: (v: { contactId: string; values: ContactValues }) => clientApi.updateContact(o, c, v.contactId, { name: v.values.name, jobTitle: v.values.jobTitle || null }), invalidate: contacts(o, c), success: "Contact updated" });
export const useReinviteContact = (o: string, c: string) => useAction({ fn: (id: string) => clientApi.reinvite(o, c, id), invalidate: contacts(o, c) });
export const useEnableContact = (o: string, c: string) => useAction({ fn: (id: string) => clientApi.enableContact(o, c, id), invalidate: contacts(o, c) });
export const useDisableContact = (o: string, c: string) => useAction({ fn: (id: string) => clientApi.disableContact(o, c, id), invalidate: contacts(o, c), success: "Contact disabled" });

export const useLinkProject = (o: string, c: string) => useAction({ fn: (projectId: string) => clientApi.linkProject(o, c, projectId), invalidate: [qk.clientProjects(o, c)], success: "Project linked" });
/** Unlinking also drops contacts' access to it server-side, so the access lists are refreshed too. */
export const useUnlinkProject = (o: string, c: string) => useAction({ fn: (projectId: string) => clientApi.unlinkProject(o, c, projectId), invalidate: [qk.clientProjects(o, c), qk.clientContacts(o, c)], success: "Project unlinked" });
export const useGrantAccess = (o: string, c: string, contactId: string) =>
  useAction({ fn: (projectId: string) => clientApi.grantAccess(o, c, contactId, projectId), invalidate: [qk.contactAccess(o, c, contactId)], success: "Access granted" });
export const useRevokeAccess = (o: string, c: string, contactId: string) =>
  useAction({ fn: (projectId: string) => clientApi.revokeAccess(o, c, contactId, projectId), invalidate: [qk.contactAccess(o, c, contactId)], success: "Access revoked" });
