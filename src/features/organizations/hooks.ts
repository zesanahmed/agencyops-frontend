"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memberApi, orgApi } from "@/lib/api/services";
import { useAuthStore } from "@/stores/auth-store";
import type { Role } from "@/types/domain";

export const qk = {
  orgs: ["organizations"] as const,
  org: (id: string) => ["organizations", id] as const,
  members: (id: string, p?: object) => ["organizations", id, "members", p ?? {}] as const,
  invitations: (id: string, p?: object) => ["organizations", id, "invitations", p ?? {}] as const,
  teams: (id: string, p?: object) => ["organizations", id, "teams", p ?? {}] as const,
  team: (id: string, t: string) => ["organizations", id, "teams", t] as const,
  teamMembers: (id: string, t: string) => ["organizations", id, "teams", t, "members"] as const,
  projects: (id: string, p?: object) => ["organizations", id, "projects", p ?? {}] as const,
  project: (id: string, p: string) => ["organizations", id, "projects", p] as const,
  sprints: (id: string, p: string) => ["organizations", id, "projects", p, "sprints"] as const,
  tasks: (id: string, p: string, q?: object) => ["organizations", id, "projects", p, "tasks", q ?? {}] as const,
  task: (id: string, p: string, t: string) => ["organizations", id, "projects", p, "tasks", t] as const,
  notifications: (id: string, p?: object) => ["organizations", id, "notifications", p ?? {}] as const,
  prefs: (id: string) => ["organizations", id, "notification-prefs"] as const,
};

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
 * The caller's role in an organization. Prefer the role on the org list item;
 * otherwise resolve it by matching the signed-in user in the member list.
 * UX only — the backend enforces the real permission.
 */
export function useOrgRole(organizationId: string): { role: Role | undefined; isLoading: boolean } {
  const user = useAuthStore((s) => s.user);
  const orgs = useOrganizations();
  const org = useOrganization(organizationId);
  const fromList = orgs.data?.items.find((o) => o.id === organizationId)?.role;
  const needFallback = orgs.isSuccess && org.isSuccess && !fromList;
  const members = useQuery({
    queryKey: qk.members(organizationId, { limit: 100 }),
    queryFn: () => memberApi.list(organizationId, { limit: 100 }),
    enabled: needFallback,
  });
  const fallback = useMemo(
    () => members.data?.items.find((m) => (user?.id && m.userId === user.id) || (user?.email && m.email === user.email))?.role,
    [members.data, user],
  );
  return { role: fromList ?? fallback, isLoading: orgs.isLoading || (needFallback && members.isLoading) };
}
