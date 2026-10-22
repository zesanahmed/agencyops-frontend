"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "@/lib/api/services";
import { qk } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import type { Organization, Role } from "@/types/domain";

export { qk } from "@/lib/query-keys";

const authed = () => useAuthStore.getState().status === "authenticated";

export function useOrganizations() {
  const status = useAuthStore((s) => s.status);
  return useQuery({ queryKey: qk.orgs, queryFn: () => orgApi.list({ limit: 100 }), enabled: status === "authenticated" });
}

/** One request serves both the organization and the caller's membership (id, role, permissions). */
function useOrgAccessQuery(id: string) {
  return useQuery({ queryKey: qk.org(id), queryFn: () => orgApi.getAccess(id), enabled: authed() });
}

export function useOrganization(id: string) {
  const q = useOrgAccessQuery(id);
  return { ...q, data: q.data?.organization } as Omit<typeof q, "data"> & { data: Organization | undefined };
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (name: string) => orgApi.create(name), onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgs }) });
}

/**
 * The caller's membership in an organization: role, membershipId and the server's permission list, all from
 * GET /organizations/:id. UX only: the backend enforces permissions on every request.
 */
export function useOrgMembership(organizationId: string): { role: Role | undefined; membershipId: string | undefined; permissions: string[] | undefined; isLoading: boolean } {
  const q = useOrgAccessQuery(organizationId);
  const m = q.data?.membership ?? undefined;
  return { role: m?.role, membershipId: m?.id, permissions: m?.permissions, isLoading: q.isLoading };
}
