"use client";

import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { projectApi, taskApi } from "@/lib/api/services";
import { qk } from "@/features/organizations/hooks";
import { useAllMembers } from "@/features/tasks/hooks";
import { useAuthStore } from "@/stores/auth-store";
import type { Project, Task } from "@/types/domain";

/** Cap: there's no org-wide task endpoint, so we fan out per project. Bounded to keep requests sane. */
export const MAX_PROJECTS_SCANNED = 12;

export interface OrgWork {
  projects: Project[];
  totalProjects: number;
  scanned: Project[];
  tasks: (Task & { projectId: string; projectName: string })[];
  isLoading: boolean;
  isError: boolean;
  truncated: boolean;
  myMembershipId?: string;
}

export function useOrgWork(o: string): OrgWork {
  const me = useAuthStore((s) => s.user);
  const projectsQ = useQuery({ queryKey: qk.projects(o, { limit: 50, scope: "work" }), queryFn: () => projectApi.list(o, { limit: 50, sortBy: "createdAt", sortOrder: "desc" }) });
  const members = useAllMembers(o);
  const scanned = useMemo(() => (projectsQ.data?.items ?? []).filter((p) => p.status !== "ARCHIVED" && p.status !== "COMPLETED").slice(0, MAX_PROJECTS_SCANNED), [projectsQ.data]);

  const taskQs = useQueries({
    queries: scanned.map((p) => ({ queryKey: qk.tasks(o, p.id, { limit: 100, scope: "work" }), queryFn: () => taskApi.list(o, p.id, { limit: 100 }) })),
  });

  const stamp = taskQs.map((q) => q.dataUpdatedAt).join(",");
  const tasks = useMemo(
    () => taskQs.flatMap((q, i) => (q.data?.items ?? []).map((t) => ({ ...t, projectId: scanned[i].id, projectName: scanned[i].name }))),
    // `stamp` changes whenever any task query's data changes; taskQs itself is a new array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stamp, scanned],
  );
  const mine = members.data?.items.find((m) => (me?.id && m.userId === me.id) || (me?.email && m.email === me.email));

  return {
    projects: projectsQ.data?.items ?? [],
    totalProjects: projectsQ.data?.meta.total ?? 0,
    scanned,
    tasks,
    isLoading: projectsQ.isLoading || members.isLoading || taskQs.some((q) => q.isLoading),
    isError: projectsQ.isError || taskQs.some((q) => q.isError),
    truncated: (projectsQ.data?.items ?? []).filter((p) => p.status !== "ARCHIVED" && p.status !== "COMPLETED").length > MAX_PROJECTS_SCANNED,
    myMembershipId: mine?.id,
  };
}
