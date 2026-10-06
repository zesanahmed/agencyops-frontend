"use client";

import Link from "next/link";
import { ListChecks, SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { PriorityBadge, TASK_PRIORITIES, TASK_STATUSES, TaskStatusBadge, statusLabel } from "@/components/shared/status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemberDirectory } from "@/features/members/use-member-directory";
import { Can, useOrg } from "@/features/organizations/org-context";
import { useUrlState } from "@/hooks/use-url-state";
import { useTasks } from "@/features/projects/hooks";
import { CreateTaskDialog } from "./create-task-dialog";

export function TaskList({ projectId }: { projectId: string }) {
  const { organizationId } = useOrg();
  const directory = useMemberDirectory(organizationId);
  const { get, page } = useUrlState();
  const status = get("status");
  const priority = get("priority");
  const search = get("search");
  const { data, isLoading, isError, error, refetch } = useTasks(organizationId, projectId, { page, limit: 20, status, priority, search, sortBy: "createdAt", sortOrder: "desc" });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput placeholder="Search tasks…" label="Search tasks" />
        <FilterSelect param="status" label="Filter by status" allLabel="All statuses" options={TASK_STATUSES.map((s) => ({ value: s, label: statusLabel.task(s) }))} />
        <FilterSelect param="priority" label="Filter by priority" allLabel="All priorities" options={TASK_PRIORITIES.map((s) => ({ value: s, label: statusLabel.priority(s) }))} />
        <div className="sm:ml-auto"><Can permission="task:create"><CreateTaskDialog projectId={projectId} /></Can></div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load tasks" />
      ) : !data?.items.length ? (
        status || priority || search ? (
          <EmptyState icon={SearchX} title="No tasks match" description="Adjust the filters or search to see more work." />
        ) : (
          <EmptyState icon={ListChecks} title="No tasks yet" description="Break the project into tasks so the team knows what to do next." action={<Can permission="task:create"><CreateTaskDialog projectId={projectId} /></Can>} />
        )
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {data.items.filter((t) => !t.parentTaskId).map((t) => (
              <li key={t.id}>
                <Link href={`/organizations/${organizationId}/projects/${projectId}/tasks/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-surface-muted">
                  <span className="min-w-0 flex-1 basis-56 truncate text-sm font-medium">{t.title}</span>
                  <PriorityBadge priority={t.priority} />
                  <TaskStatusBadge status={t.status} />
                  {t.assigneeMembershipId ? <Avatar name={directory.nameOf(t.assigneeMembershipId)} size="sm" /> : <span className="w-6 text-center text-xs text-muted-foreground" aria-label="Unassigned">—</span>}
                </Link>
              </li>
            ))}
          </ul>
          <Pagination meta={data.meta} />
        </>
      )}
    </div>
  );
}
