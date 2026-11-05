"use client";

import Link from "next/link";
import { ArrowLeft, ListChecks, Megaphone } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { PriorityBadge, ProjectStatusBadge, TaskStatusBadge, TASK_STATUSES, statusLabel } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlState } from "@/hooks/use-url-state";
import { ApiError } from "@/lib/api/errors";
import { formatCalendarDate, formatDateTime } from "@/lib/format";
import { usePortalProject, usePortalTasks, usePortalUpdates } from "./hooks";
import { ProgressBar } from "./progress-bar";

const TABS = ["overview", "tasks", "updates"] as const;
type Tab = (typeof TABS)[number];

export function PortalProjectDetail({ projectId }: { projectId: string }) {
  const { get, set } = useUrlState();
  const raw = get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(raw) ? (raw as Tab) : "overview";
  const q = usePortalProject(projectId);

  if (q.isLoading) return <div className="space-y-4" role="status" aria-label="Loading project"><Skeleton className="h-10 w-72" /><Skeleton className="h-40" /></div>;
  if (q.isError || !q.data) {
    // A project without a grant answers 404 (the server never says whether it exists).
    const notFound = q.error instanceof ApiError && (q.error.status === 404 || q.error.status === 403);
    return <ErrorState error={q.error} onRetry={() => q.refetch()} title={notFound ? "Project not found" : "Couldn't load this project"} />;
  }
  const p = q.data;

  return (
    <>
      <Link href="/client/projects" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden /> All projects</Link>
      <PageHeader title={p.name} description={p.description ?? undefined} actions={<ProjectStatusBadge status={p.status} />} />
      <Tabs value={tab} onValueChange={(v) => set({ tab: v === "overview" ? "" : v, status: "", page: "" })}>
        <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="tasks">Tasks</TabsTrigger><TabsTrigger value="updates">Updates</TabsTrigger></TabsList>
        <TabsContent value="overview"><Overview projectId={projectId} /></TabsContent>
        <TabsContent value="tasks"><TasksTab projectId={projectId} /></TabsContent>
        <TabsContent value="updates"><UpdatesTab projectId={projectId} /></TabsContent>
      </Tabs>
    </>
  );
}

function Overview({ projectId }: { projectId: string }) {
  const p = usePortalProject(projectId).data;
  if (!p) return null;
  const { progress } = p;
  return (
    <div className="space-y-6">
      <section aria-labelledby="prog-h" className="space-y-3 rounded-lg border border-border bg-surface p-5">
        <h2 id="prog-h" className="text-sm font-semibold">Progress</h2>
        <ProgressBar percent={progress.percentComplete} label="Project progress" />
        <p className="text-sm text-muted-foreground">{progress.completedTasks} of {progress.totalTasks} tasks are done.</p>
        {progress.totalTasks > 0 ? (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {TASK_STATUSES.filter((s) => (progress.byStatus[s] ?? 0) > 0).map((s) => <li key={s} className="flex items-center gap-1.5"><TaskStatusBadge status={s} /><span className="tabular-nums text-muted-foreground">{progress.byStatus[s]}</span></li>)}
          </ul>
        ) : null}
      </section>
      <dl className="grid gap-4 rounded-lg border border-border bg-surface p-5 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">Start</dt><dd className="font-medium">{p.startDate ? formatCalendarDate(p.startDate) : "Not set"}</dd></div>
        <div><dt className="text-muted-foreground">Due</dt><dd className="font-medium">{p.dueDate ? formatCalendarDate(p.dueDate) : "Not set"}</dd></div>
      </dl>
    </div>
  );
}

const PAGE = 15;
function TasksTab({ projectId }: { projectId: string }) {
  const { get, page } = useUrlState();
  const rawStatus = get("status");
  const status = (TASK_STATUSES as readonly string[]).includes(rawStatus) ? rawStatus : "";
  const q = usePortalTasks(projectId, { page, limit: PAGE, ...(status ? { status } : {}) });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Tasks your agency has chosen to share with you.</p>
      <FilterSelect param="status" label="Filter by status" allLabel="All statuses" options={TASK_STATUSES.map((s) => ({ value: s, label: statusLabel.task(s) }))} />
      {q.isLoading ? <div className="space-y-2" role="status" aria-label="Loading tasks">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load tasks" />
        : !q.data?.items.length ? <EmptyState icon={ListChecks} title={status ? "No tasks with this status" : "No shared tasks yet"} description={status ? "Try another status." : "Your agency hasn't shared any tasks for this project yet."} />
        : (<>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {q.data.items.map((t) => (
              <li key={t.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="min-w-0 flex-1 break-words text-sm font-medium">{t.title}</p>
                  <PriorityBadge priority={t.priority} /><TaskStatusBadge status={t.status} />
                </div>
                {t.description ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description}</p> : null}
                {t.dueDate ? <p className="mt-1 text-xs text-muted-foreground">Due {formatCalendarDate(t.dueDate)}</p> : null}
              </li>
            ))}
          </ul>
          <Pagination meta={q.data.meta} />
        </>)}
    </div>
  );
}

function UpdatesTab({ projectId }: { projectId: string }) {
  const { page } = useUrlState();
  const q = usePortalUpdates(projectId, { page, limit: 10 });
  if (q.isLoading) return <div className="space-y-2" role="status" aria-label="Loading updates">{[0, 1].map((i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load updates" />;
  if (!q.data?.items.length) return <EmptyState icon={Megaphone} title="No updates yet" description="Progress notes from your agency will appear here." />;
  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {q.data.items.map((u) => (
          <li key={u.id} className="rounded-lg border border-border bg-surface p-4">
            <h3 className="font-medium leading-snug">{u.title}</h3>
            <p className="text-xs text-muted-foreground">{u.author.name} · <time dateTime={u.createdAt}>{formatDateTime(u.createdAt)}</time></p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">{u.body}</p>
          </li>
        ))}
      </ul>
      <Pagination meta={q.data.meta} />
    </div>
  );
}
