"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { Pagination } from "@/components/shared/pagination";
import { useOrg } from "@/features/organizations/org-context";
import { useProjects } from "@/features/projects/hooks";
import { useUrlState } from "@/hooks/use-url-state";
import { timeAgo } from "@/lib/format";
import { REQUEST_STATUSES, REQUEST_TYPES, type ClientRequest } from "@/types/domain";
import { useClientRequests } from "./hooks";
import { RequestDialog } from "./request-dialog";
import { REQUEST_TYPE_LABEL, RequestStatusBadge, requestStatusLabel } from "./request-meta";

const PAGE_SIZE = 15;

/**
 * Client requests, newest first. With `projectId` it is one project's list; without, the organization-wide inbox (and a
 * project filter appears). Status/type/project/page live in the URL.
 */
export function RequestsList({ projectId }: { projectId?: string }) {
  const { organizationId: o } = useOrg();
  const { get, set, page } = useUrlState();
  const rawStatus = get("status"); const rawType = get("type");
  const status = (REQUEST_STATUSES as readonly string[]).includes(rawStatus) ? rawStatus : "";
  const type = (REQUEST_TYPES as readonly string[]).includes(rawType) ? rawType : "";
  const project = projectId ?? get("projectId");
  const projects = useProjects(o, { limit: 100, sortBy: "name", sortOrder: "asc" });
  const nameOf = new Map((projects.data?.items ?? []).map((p) => [p.id, p.name]));
  const q = useClientRequests(o, { page, limit: PAGE_SIZE, ...(status ? { status } : {}), ...(type ? { type } : {}), ...(project ? { projectId: project } : {}) });
  const [open, setOpen] = useState<ClientRequest | null>(null);
  const filtered = Boolean(status || type || (!projectId && project));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect param="status" label="Filter by status" allLabel="All statuses" options={REQUEST_STATUSES.map((s) => ({ value: s, label: requestStatusLabel(s) }))} />
        <FilterSelect param="type" label="Filter by type" allLabel="All types" options={REQUEST_TYPES.map((t) => ({ value: t, label: REQUEST_TYPE_LABEL[t] }))} />
        {!projectId ? <FilterSelect param="projectId" label="Filter by project" allLabel="All projects" options={(projects.data?.items ?? []).map((p) => ({ value: p.id, label: p.name }))} /> : null}
        {filtered ? <Button variant="ghost" size="sm" onClick={() => set({ status: "", type: "", ...(!projectId ? { projectId: "" } : {}) })}>Clear filters</Button> : null}
      </div>

      {q.isLoading ? <div className="space-y-2" role="status" aria-label="Loading requests">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load requests" />
        : !q.data?.items.length ? <EmptyState icon={Inbox} title={filtered ? "No requests match these filters" : "No client requests"} description={filtered ? "Try a different status or type." : "When a client asks a question, requests a change or reports an issue from their portal, it lands here."} />
        : (<>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {q.data.items.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setOpen(r)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-surface-muted">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{r.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{REQUEST_TYPE_LABEL[r.type]}{r.contact ? ` · ${r.contact.name}` : ""}{!projectId && nameOf.get(r.projectId) ? ` · ${nameOf.get(r.projectId)}` : ""} · {timeAgo(r.createdAt)}</span>
                  </span>
                  <RequestStatusBadge status={r.status} />
                </button>
              </li>
            ))}
          </ul>
          <Pagination meta={q.data.meta} />
        </>)}

      <RequestDialog request={open} projectName={nameOf.get(open?.projectId ?? "")} onClose={() => setOpen(null)} />
    </div>
  );
}
