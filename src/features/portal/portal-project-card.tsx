import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { formatCalendarDate } from "@/lib/format";
import type { PortalProject } from "@/types/domain";
import { ProgressBar } from "./progress-bar";

export function PortalProjectCard({ project: p }: { project: PortalProject }) {
  return (
    <Link href={`/client/projects/${p.id}`} className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-3"><h3 className="font-medium leading-snug">{p.name}</h3><ProjectStatusBadge status={p.status} /></div>
      {p.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p> : null}
      <ProgressBar percent={p.progress.percentComplete} label={`${p.name} progress`} />
      <p className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock className="size-3.5" aria-hidden />
        {p.dueDate ? `Due ${formatCalendarDate(p.dueDate)}` : "No due date"} · {p.progress.completedTasks} of {p.progress.totalTasks} tasks done
      </p>
    </Link>
  );
}
