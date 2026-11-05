"use client";

import Link from "next/link";
import { CheckCircle2, FolderKanban, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalAuth } from "./portal-auth-provider";
import { usePortalProjects } from "./hooks";
import { PortalProjectsView } from "./portal-projects-view";

function Stat({ icon: Icon, label, value }: { icon: typeof FolderKanban; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
      <span className="flex size-9 items-center justify-center rounded-md bg-primary-soft text-primary"><Icon className="size-4" aria-hidden /></span>
      <div><p className="text-xl font-semibold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
    </div>
  );
}

export function PortalDashboard() {
  const { contact } = usePortalAuth();
  const q = usePortalProjects();
  const projects = q.data ?? [];
  const active = projects.filter((p) => p.status === "ACTIVE").length;
  const tasksDone = projects.reduce((n, p) => n + p.progress.completedTasks, 0);
  const tasksTotal = projects.reduce((n, p) => n + p.progress.totalTasks, 0);

  return (
    <>
      <PageHeader title={`Hello, ${contact?.name.split(" ")[0] ?? "there"}`} description={`Here's where your work with ${contact?.organizationName ?? "your agency"} stands.`} />
      {q.isLoading ? <div className="mb-8 grid gap-3 sm:grid-cols-3" role="status" aria-label="Loading summary">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        : q.isSuccess && projects.length ? (
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            <Stat icon={FolderKanban} label={active === 1 ? "active project" : "active projects"} value={active} />
            <Stat icon={CheckCircle2} label="tasks completed" value={tasksDone} />
            <Stat icon={ListChecks} label="tasks in total" value={tasksTotal} />
          </div>
        ) : null}
      <div className="mb-3 flex items-baseline justify-between"><h2 className="text-sm font-semibold">Your projects</h2><Link href="/client/projects" className="text-sm text-primary hover:underline">See all</Link></div>
      <PortalProjectsView limit={4} />
    </>
  );
}
