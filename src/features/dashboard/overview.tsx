"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatCard } from "@/components/shared/stat-card";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Can, useOrg } from "@/features/organizations/org-context";
import { CreateProjectDialog } from "@/features/projects/project-form-dialog";
import { notificationApi } from "@/lib/api/services";
import { qk } from "@/features/organizations/hooks";
import { useOrgWork } from "./use-org-work";

const WorkDistributionChart = dynamic(() => import("./work-distribution-chart").then((m) => m.WorkDistributionChart), { ssr: false, loading: () => <Skeleton className="h-56" /> });

export function Overview() {
  const { organizationId: o } = useOrg();
  const work = useOrgWork(o);
  const unread = useQuery({ queryKey: qk.notifications(o, { unreadOnly: true, limit: 1 }), queryFn: () => notificationApi.list(o, { unreadOnly: true, limit: 1 }) });

  if (work.isLoading) return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-72" /></div>;
  if (work.isError) return <ErrorState title="Couldn't load the overview" />;

  if (!work.totalProjects)
    return <EmptyState icon={FolderKanban} title="Start with a project" description="Your overview fills in as projects and tasks are created: what's active, what's blocked, what's next." action={<Can permission="project.manage"><CreateProjectDialog /></Can>} />;

  const active = work.projects.filter((p) => p.status === "ACTIVE").length;
  const counts: Record<string, number> = {};
  for (const t of work.tasks) if (!t.parentTaskId) counts[t.status] = (counts[t.status] ?? 0) + 1;
  const open = work.tasks.filter((t) => !t.parentTaskId && t.status !== "DONE").length;
  const blocked = counts.BLOCKED ?? 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active projects" value={active} hint={`${work.totalProjects} total`} />
        <StatCard label="Open tasks" value={open} hint={`across ${work.scanned.length} open projects`} />
        <StatCard label="Blocked" value={blocked} tone="danger" hint={blocked ? "Needs unblocking" : "Nothing stuck"} />
        <StatCard label="Unread" value={unread.data?.meta.total ?? 0} hint="notifications" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="dist-h" className="rounded-lg border border-border bg-surface p-4">
          <h2 id="dist-h" className="text-sm font-semibold">Where the work is sitting</h2>
          <p className="mb-3 text-xs text-muted-foreground">Top-level tasks in open projects, by status.</p>
          {work.tasks.length ? <WorkDistributionChart counts={counts} /> : <p className="py-16 text-center text-sm text-muted-foreground">No tasks yet. Add some to see the distribution.</p>}
        </section>
        <section aria-labelledby="recent-h">
          <div className="mb-2 flex items-center justify-between"><h2 id="recent-h" className="text-sm font-semibold">Recent projects</h2><Link href={`/organizations/${o}/projects`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">All projects <ArrowRight className="size-3" /></Link></div>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {work.projects.slice(0, 5).map((p) => (
              <li key={p.id}><Link href={`/organizations/${o}/projects/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-muted"><span className="truncate text-sm font-medium">{p.name}</span><ProjectStatusBadge status={p.status} /></Link></li>
            ))}
          </ul>
        </section>
      </div>
      {work.truncated ? <p className="text-xs text-muted-foreground">Task figures cover your {work.scanned.length} most recent open projects.</p> : null}
    </div>
  );
}
