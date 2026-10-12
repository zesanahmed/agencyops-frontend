"use client";

import Link from "next/link";
import { ListChecks, SearchX } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { PriorityBadge, TASK_PRIORITIES, TASK_STATUSES, TaskStatusBadge, statusLabel } from "@/components/shared/status-badge";
import { useMemberDirectory } from "@/features/members/use-member-directory";
import { Can, useOrg } from "@/features/organizations/org-context";
import { useSprints, useTasks } from "@/features/projects/hooks";
import { taskSchedule } from "@/features/projects/project-metrics";
import { ScheduleBadge } from "@/features/projects/project-schedule-badge";
import { useUrlState } from "@/hooks/use-url-state";
import { formatCalendarDate } from "@/lib/format";
import { CreateTaskDialog } from "./task-form-dialog";

const SORTS = [
  { value: "createdAt:desc", label: "Newest first" },
  { value: "createdAt:asc", label: "Oldest first" },
  { value: "dueDate:asc", label: "Due soonest" },
  { value: "priority:desc", label: "Priority (highest first)" },
] as const;
const FILTER_PARAMS = ["status", "priority", "search", "sprint", "assignee"] as const;

export function TaskList({ projectId }: { projectId: string }) {
  const { organizationId, membershipId: me } = useOrg();
  const directory = useMemberDirectory(organizationId);
  const sprints = useSprints(organizationId, projectId);
  const { get, set, page } = useUrlState();
  const [status, priority, search, sprint, assignee] = FILTER_PARAMS.map((k) => get(k));
  const sort = SORTS.some((s) => s.value === get("sort")) ? get("sort") : SORTS[0].value;
  const [sortBy, sortOrder] = sort.split(":") as [string, "asc" | "desc"];
  const { data, isLoading, isError, error, refetch } = useTasks(organizationId, projectId, {
    page, limit: 20, status, priority, search, sprintId: sprint, assigneeMembershipId: assignee, sortBy, sortOrder,
  });
  const sprintName = new Map((sprints.data?.items ?? []).map((s) => [s.id, s.name]));
  const filtered = FILTER_PARAMS.some((k) => get(k));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <SearchInput placeholder="Search tasks…" label="Search tasks" />
        <FilterSelect param="status" label="Filter by status" allLabel="All statuses" options={TASK_STATUSES.map((s) => ({ value: s, label: statusLabel.task(s) }))} />
        <FilterSelect param="priority" label="Filter by priority" allLabel="All priorities" options={TASK_PRIORITIES.map((s) => ({ value: s, label: statusLabel.priority(s) }))} />
        <FilterSelect param="sprint" label="Filter by sprint" allLabel="All sprints" options={(sprints.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }))} />
        <FilterSelect param="assignee" label="Filter by assignee" allLabel="Everyone"
          options={[...(me ? [{ value: me, label: "Assigned to me" }] : []), ...directory.list.filter((m) => m.id !== me).map((m) => ({ value: m.id, label: m.name }))]} />
        <Select aria-label="Sort tasks" value={sort} onChange={(e) => set({ sort: e.target.value === SORTS[0].value ? "" : e.target.value })} className="w-auto min-w-40">
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <div className="lg:ml-auto"><Can permission="task:create"><CreateTaskDialog projectId={projectId} /></Can></div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load tasks" />
      ) : !data?.items.length ? (
        filtered ? (
          <EmptyState icon={SearchX} title="No tasks match" description="Adjust the filters or search to see more work."
            action={<Button variant="secondary" onClick={() => set(Object.fromEntries(FILTER_PARAMS.map((k) => [k, ""])))}>Clear filters</Button>} />
        ) : (
          <EmptyState icon={ListChecks} title="No tasks yet" description="Break the project into tasks so the team knows what to do next." action={<Can permission="task:create"><CreateTaskDialog projectId={projectId} /></Can>} />
        )
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {data.items.filter((t) => !t.parentTaskId).map((t) => {
              const schedule = taskSchedule(t);
              const sprintLabel = t.sprintId ? sprintName.get(t.sprintId) : undefined;
              return (
                <li key={t.id}>
                  <Link href={`/organizations/${organizationId}/projects/${projectId}/tasks/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-surface-muted">
                    <span className="min-w-0 flex-1 basis-56">
                      <span className="block truncate text-sm font-medium">{t.title}</span>
                      {sprintLabel || t.dueDate ? (
                        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          {sprintLabel ? <span>{sprintLabel}</span> : null}
                          {t.dueDate ? <span>Due {formatCalendarDate(t.dueDate)}</span> : null}
                          <ScheduleBadge schedule={schedule} />
                        </span>
                      ) : null}
                    </span>
                    <PriorityBadge priority={t.priority} />
                    <TaskStatusBadge status={t.status} />
                    {t.assigneeMembershipId ? <Avatar name={directory.nameOf(t.assigneeMembershipId)} size="sm" /> : <span className="w-6 text-center text-xs text-muted-foreground" aria-label="Unassigned">—</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pagination meta={data.meta} />
        </>
      )}
    </div>
  );
}
