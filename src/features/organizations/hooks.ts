"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orgApi } from "@/lib/api/services";
import { qk } from "@/lib/query-keys";
import { useMemberDirectory } from "@/features/members/use-member-directory";
import { useAuthStore } from "@/stores/auth-store";
import type { Role } from "@/types/domain";

export { qk } from "@/lib/query-keys";

const authed = () => useAuthStore.getState().status === "authenticated";

export function useOrganizations() {
  const status = useAuthStore((s) => s.status);
  return useQuery({ queryKey: qk.orgs, queryFn: () => orgApi.list({ limit: 100 }), enabled: status === "authenticated" });
}

export function useOrganization(id: string) {
  return useQuery({ queryKey: qk.org(id), queryFn: () => orgApi.get(id), enabled: authed() });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (name: string) => orgApi.create(name), onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgs }) });
}

/**
 * The caller's membership in an organization. The backend exposes the caller's
 * role only through the members list (organizations carry no role), so we find
 * ourselves in the member directory. UX only: the backend enforces permissions.
 */
export function useOrgMembership(organizationId: string): { role: Role | undefined; membershipId: string | undefined; isLoading: boolean } {
  const user = useAuthStore((s) => s.user);
  const org = useOrganization(organizationId);
  // Don't ask for members of an organization we already know is inaccessible.
  const dir = useMemberDirectory(organizationId, org.isSuccess);
  const me = user ? dir.list.find((m) => m.userId === user.id) : undefined;
  return { role: me?.role, membershipId: me?.id, isLoading: org.isLoading || (org.isSuccess && dir.isLoading) };
}
