"use client";

import Link from "next/link";
import { FolderKanban, SearchX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { PROJECT_STATUSES, ProjectStatusBadge, statusLabel } from "@/components/shared/status-badge";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Can, useOrg } from "@/features/organizations/org-context";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDate } from "@/lib/format";
import { CreateProjectDialog } from "./project-form-dialog";
import { useProjects } from "./hooks";

const SORTS = [
  { value: "createdAt:desc", label: "Newest first" },
  { value: "createdAt:asc", label: "Oldest first" },
  { value: "name:asc", label: "Name A–Z" },
  { value: "name:desc", label: "Name Z–A" },
];

export function ProjectList() {
  const { organizationId } = useOrg();
  const { get, set, page } = useUrlState();
  const status = get("status");
  const search = get("search");
  const sort = get("sort", "createdAt:desc");
  const [sortBy, sortOrder] = sort.split(":") as [string, "asc" | "desc"];

  const { data, isLoading, isError, error, refetch, isFetching } = useProjects(organizationId, { page, limit: 12, status, search, sortBy, sortOrder });
  const filtered = Boolean(status || search);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput placeholder="Search projects…" label="Search projects" />
        <FilterSelect param="status" label="Filter by status" allLabel="All statuses" options={PROJECT_STATUSES.map((s) => ({ value: s, label: statusLabel.project(s) }))} />
        <Select aria-label="Sort projects" value={sort} onChange={(e) => set({ sort: e.target.value === "createdAt:desc" ? "" : e.target.value })} className="w-auto min-w-36 sm:ml-auto">
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load projects" />
      ) : !data?.items.length ? (
        filtered ? (
          <EmptyState icon={SearchX} title="No projects match" description="Try a different search or clear the status filter." />
        ) : (
          <EmptyState icon={FolderKanban} title="No projects yet" description="Projects group sprints, tasks and people. Create the first one to start planning work."
            action={<Can permission="project:create"><CreateProjectDialog /></Can>} />
        )
      ) : (
        <>
          <ul className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${isFetching ? "opacity-70 transition-opacity" : ""}`}>
            {data.items.map((p) => (
              <li key={p.id}>
                <Link href={`/organizations/${organizationId}/projects/${p.id}`} className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium leading-snug">{p.name}</h3>
                    <ProjectStatusBadge status={p.status} />
                  </div>
                  <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">{p.description || "No description yet."}</p>
                  <p className="text-xs text-muted-foreground">Created {formatDate(p.createdAt)}</p>
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
