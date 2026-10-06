"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { memberApi } from "@/lib/api/services";
import { qk } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import type { Membership } from "@/types/domain";

const MAX_PAGES = 20; // 2,000 members: far beyond a small agency; bounded so a bad response can't loop forever.

/**
 * The backend identifies people by membershipId everywhere (task assignees,
 * comment authors, team/project members, collaborators). This fetches every
 * ACTIVE member once so the UI can show names. GET /members needs only
 * `membership:read`, which all three roles have.
 */
export async function fetchAllMembers(organizationId: string): Promise<Membership[]> {
  const all: Membership[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const r = await memberApi.list(organizationId, { page, limit: 100 });
    all.push(...r.items);
    if (page >= r.meta.totalPages) break;
  }
  return all;
}

export function useMemberDirectory(organizationId: string, enabled = true) {
  const authed = useAuthStore((s) => s.status === "authenticated");
  const q = useQuery({
    queryKey: qk.memberDirectory(organizationId),
    queryFn: () => fetchAllMembers(organizationId),
    enabled: authed && enabled,
    staleTime: 60_000,
  });

  return useMemo(() => {
    const list = [...(q.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    const byId = new Map(list.map((m) => [m.id, m]));
    return {
      list,
      byId,
      /** Display name for a membershipId; removed members are no longer in the directory. */
      nameOf: (id?: string | null): string => (id ? (byId.get(id)?.name ?? "Former member") : ""),
      isLoading: q.isLoading,
      isError: q.isError,
      refetch: q.refetch,
    };
  }, [q.data, q.isLoading, q.isError, q.refetch]);
}
