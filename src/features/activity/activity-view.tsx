"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Activity as ActivityIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrg } from "@/features/organizations/org-context";
import { useProjects } from "@/features/projects/hooks";
import { groupByDay } from "@/features/notifications/notification-meta";
import { useUrlState } from "@/hooks/use-url-state";
import { activityApi } from "@/lib/api/services";
import { qk } from "@/lib/query-keys";
import { formatDateTime, timeAgo } from "@/lib/format";
import { activityHref, activityIcon, actionLabel, ENTITY_FILTERS } from "./activity-meta";

const PAGE_SIZE = 20;
const ENTITY_VALUES = ENTITY_FILTERS.map((f) => f.value);

/** Organization activity feed. Filters and page live in the URL (?entityType=&projectId=&page=). */
export function ActivityView() {
  const { organizationId: o, role } = useOrg();
  const { get, set, page } = useUrlState();
  const rawEntity = get("entityType");
  const entityType = ENTITY_VALUES.includes(rawEntity) ? rawEntity : "";
  const projectId = get("projectId");
  const params = { page, limit: PAGE_SIZE, ...(entityType ? { entityType } : {}), ...(projectId ? { projectId } : {}) };

  const projects = useProjects(o, { limit: 100, sortBy: "createdAt", sortOrder: "desc" });
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: [...qk.org(o), "activity", params], queryFn: () => activityApi.list(o, params), placeholderData: (p) => p });
  const filtered = Boolean(entityType || projectId);

  // A filter change (or a deleted project) can leave the URL page past the end: step back to the last real page.
  useEffect(() => {
    if (data && !data.items.length && page > 1) set({ page: String(Math.max(1, data.meta.totalPages)) });
  }, [data, page, set]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect param="entityType" label="Filter by type" allLabel="All activity" options={ENTITY_FILTERS} />
        <FilterSelect param="projectId" label="Filter by project" allLabel="All projects" options={(projects.data?.items ?? []).map((p) => ({ value: p.id, label: p.name }))} />
        {filtered ? <Button variant="ghost" size="sm" onClick={() => set({ entityType: "", projectId: "" })}>Clear filters</Button> : null}
      </div>
      {role === "TEAM_MEMBER" ? <p className="text-xs text-muted-foreground">You see activity from the projects you belong to, directly or through a team.</p> : null}

      {isLoading ? <div className="space-y-2" role="status" aria-label="Loading activity">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        : isError ? <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load activity" />
        : !data?.items.length ? <EmptyState icon={ActivityIcon} title={filtered ? "No activity matches these filters" : "No activity yet"}
            description={filtered ? "Try a different type or project." : "Creating projects, moving tasks, starting sprints and commenting will build this feed."}
            action={filtered ? <Button variant="secondary" onClick={() => set({ entityType: "", projectId: "" })}>Clear filters</Button> : undefined} />
        : (<>
          <div className="space-y-5">
            {groupByDay(data.items).map((g) => (
              <section key={g.label} aria-label={g.label}>
                <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{g.label}</h2>
                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
                  {g.items.map((a) => {
                    const Icon = activityIcon(a.action);
                    const href = activityHref(o, a);
                    return (
                      <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-foreground" title={actionLabel(a.action)}><Icon className="size-3.5" aria-hidden /><span className="sr-only">{actionLabel(a.action)}</span></span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm">{href ? <Link href={href} className="underline-offset-2 hover:underline">{a.summary}</Link> : a.summary}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground"><time dateTime={a.createdAt} title={formatDateTime(a.createdAt)}>{timeAgo(a.createdAt)}</time></p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
          <Pagination meta={data.meta} />
        </>)}
    </div>
  );
}
