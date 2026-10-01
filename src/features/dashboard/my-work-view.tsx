"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PriorityBadge, TaskStatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrg } from "@/features/organizations/org-context";
import { useOrgWork } from "./use-org-work";

const ORDER = ["IN_PROGRESS", "BLOCKED", "IN_REVIEW", "TODO"];

export function MyWorkView() {
  const { organizationId: o } = useOrg();
  const work = useOrgWork(o);
  if (work.isLoading) return <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>;
  if (work.isError) return <ErrorState title="Couldn't load your work" />;

  const mine = work.tasks.filter((t) => work.myMembershipId && t.assigneeMembershipId === work.myMembershipId && t.status !== "DONE" && !t.parentTaskId);
  if (!mine.length)
    return <EmptyState icon={CheckCircle2} title="Nothing assigned to you" description="When a task is assigned to you it will appear here, grouped by where it stands." />;

  const groups = ORDER.map((s) => ({ s, items: mine.filter((t) => t.status === s) })).filter((g) => g.items.length);
  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.s} aria-label={g.s}>
          <div className="mb-2 flex items-center gap-2"><TaskStatusBadge status={g.s} /><span className="text-xs text-muted-foreground">{g.items.length}</span></div>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {g.items.map((t) => (
              <li key={t.id}>
                <Link href={`/organizations/${o}/projects/${t.projectId}/tasks/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface-muted">
                  <span className="min-w-0 flex-1 basis-56"><span className="block truncate text-sm font-medium">{t.title}</span><span className="block truncate text-xs text-muted-foreground">{t.projectName}</span></span>
                  <PriorityBadge priority={t.priority} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {work.truncated ? <p className="text-xs text-muted-foreground">Showing work from your {work.scanned.length} most recent open projects.</p> : null}
    </div>
  );
}
