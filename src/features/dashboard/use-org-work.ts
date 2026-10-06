"use client";

import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { projectApi, taskApi } from "@/lib/api/services";
import { qk } from "@/lib/query-keys";
import type { Project, Task } from "@/types/domain";

/** There is no org-wide task endpoint, so we fan out per project. Bounded to keep request counts sane. */
export const MAX_PROJECTS_SCANNED = 12;
const TASK_PAGE = 100; // backend maximum page size

export interface OrgWorkTask extends Task { projectName: string }

export interface OrgWork {
  projects: Project[];
  totalProjects: number;
  scanned: Project[];
  tasks: OrgWorkTask[];
  isLoading: boolean;
  isError: boolean;
  /** More open projects exist than were scanned. */
  projectsTruncated: boolean;
  /** At least one project has more tasks than a single page returned. */
  tasksTruncated: boolean;
}

/**
 * Open-project task aggregation for the overview and "My work".
 * Pass `assigneeMembershipId` to let the BACKEND filter (so a person's own tasks
 * are never lost to page truncation); omit it for org-wide counts.
 */
export function useOrgWork(o: string, opts: { assigneeMembershipId?: string; enabled?: boolean } = {}): OrgWork {
  const enabled = opts.enabled ?? true;
  const projectsQ = useQuery({
    queryKey: qk.projects(o, { limit: 100, scope: "work" }),
    queryFn: () => projectApi.list(o, { limit: 100, sortBy: "createdAt", sortOrder: "desc" }),
    enabled,
  });
  const open = useMemo(() => (projectsQ.data?.items ?? []).filter((p) => p.status !== "COMPLETED" && p.status !== "CANCELLED"), [projectsQ.data]);
  const scanned = useMemo(() => open.slice(0, MAX_PROJECTS_SCANNED), [open]);

  const taskQs = useQueries({
    queries: scanned.map((p) => ({
      queryKey: qk.tasks(o, p.id, { limit: TASK_PAGE, scope: "work", assignee: opts.assigneeMembershipId ?? null }),
      queryFn: () => taskApi.list(o, p.id, { limit: TASK_PAGE, assigneeMembershipId: opts.assigneeMembershipId }),
      enabled,
    })),
  });

  const stamp = taskQs.map((q) => q.dataUpdatedAt).join(",");
  const tasks = useMemo(
    () => taskQs.flatMap((q, i) => (q.data?.items ?? []).map((t) => ({ ...t, projectName: scanned[i].name }))),
    // `stamp` changes whenever any task query's data changes; taskQs itself is a new array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stamp, scanned],
  );

  return {
    projects: projectsQ.data?.items ?? [],
    totalProjects: projectsQ.data?.meta.total ?? 0,
    scanned,
    tasks,
    isLoading: projectsQ.isLoading || taskQs.some((q) => q.isLoading),
    isError: projectsQ.isError || taskQs.some((q) => q.isError),
    projectsTruncated: open.length > MAX_PROJECTS_SCANNED,
    tasksTruncated: taskQs.some((q) => q.data ? q.data.meta.total > q.data.items.length : false),
  };
}
