"use client";

import Link from "next/link";
import { ArrowRight, CalendarRange, CircleCheck, UsersRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarStack } from "@/components/shared/avatar-stack";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PriorityBadge, SprintStatusBadge, TASK_STATUSES, statusLabel } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { useMemberDirectory } from "@/features/members/use-member-directory";
import { useOrg } from "@/features/organizations/org-context";
import { useProjectTeams, useTeamDirectory } from "@/features/teams/hooks";
import { ScheduleBadge } from "./project-schedule-badge";
import { formatCalendarDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Project, TaskStatus } from "@/types/domain";
import { useProjectMembers, useSprints, useTasks } from "./hooks";
import { pickFocusSprint, projectSchedule, taskSchedule, scheduleLabel, sprintTaskProgress, summarizeTasks, timeElapsedPct } from "./project-metrics";

const TASK_PAGE = 100; // backend maximum page size
const SEGMENT: Record<TaskStatus, string> = {
  BACKLOG: "bg-border-strong", TODO: "bg-muted-foreground/50", IN_PROGRESS: "bg-info", IN_REVIEW: "bg-warning", DONE: "bg-success",
};

export function ProjectOverview({ project, onOpenTab }: { project: Project; onOpenTab: (tab: string) => void }) {
  const { organizationId: o } = useOrg();
  const directory = useMemberDirectory(o);
  const tasksQ = useTasks(o, project.id, { page: 1, limit: TASK_PAGE, sortBy: "createdAt", sortOrder: "desc" });
  const sprintsQ = useSprints(o, project.id);
  const membersQ = useProjectMembers(o, project.id);
  const teamsQ = useProjectTeams(o, project.id);
  const teamDir = useTeamDirectory(o);

  if (tasksQ.isLoading || sprintsQ.isLoading) {
    return <div className="space-y-4"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-56" /></div>;
  }
  if (tasksQ.isError || sprintsQ.isError) {
    return <ErrorState error={tasksQ.error ?? sprintsQ.error} onRetry={() => { void tasksQ.refetch(); void sprintsQ.refetch(); }} title="Couldn't load the project overview" />;
  }

  const tasks = (tasksQ.data?.items ?? []).filter((t) => !t.parentTaskId);
  const summary = summarizeTasks(tasks);
  const truncated = (tasksQ.data?.meta.total ?? 0) > (tasksQ.data?.items.length ?? 0);
  const schedule = projectSchedule(project);
  const focus = pickFocusSprint(sprintsQ.data?.items ?? []);
  const sprintProgress = focus ? sprintTaskProgress(tasks, focus.sprint.id) : null;
  const elapsed = focus?.kind === "active" ? timeElapsedPct(focus.sprint.startDate, focus.sprint.endDate) : null;
  const memberNames = (membersQ.data ?? []).map((m) => directory.nameOf(m.membershipId));
  const taskHref = (id: string) => `/organizations/${o}/projects/${project.id}/tasks/${id}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Progress" value={`${summary.pct}%`} hint={summary.total ? `${summary.done} of ${summary.total} tasks done` : "No tasks yet"} />
        <StatCard label="Open tasks" value={summary.open} hint={summary.overdue.length ? `${summary.overdue.length} overdue` : summary.total ? `${summary.byStatus.IN_PROGRESS} in progress` : undefined} />
        <StatCard label="Unassigned" value={summary.unassigned} hint="open tasks with no owner" />
        <StatCard label="Schedule" value={schedule.state === "closed" ? statusLabel.project(project.status) : scheduleLabel(schedule) || "No due date"}
          hint={project.startDate || project.dueDate ? `${formatCalendarDate(project.startDate)} → ${formatCalendarDate(project.dueDate)}` : "Add dates by editing the project"} />
      </div>
      {truncated ? <p className="text-xs text-muted-foreground">Based on the {tasks.length} most recent tasks of {tasksQ.data?.meta.total}. Filter in the Tasks tab for the rest.</p> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section aria-labelledby="ov-status" className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 id="ov-status" className="text-sm font-semibold">Work by status</h2>
              <button type="button" onClick={() => onOpenTab("tasks")} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">All tasks <ArrowRight className="size-3" aria-hidden /></button>
            </div>
            {summary.total === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No tasks yet. Add tasks in the Tasks tab to see how the work is distributed.</p>
            ) : (
              <>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
                  {TASK_STATUSES.map((s) => summary.byStatus[s] ? <div key={s} className={cn("h-full", SEGMENT[s])} style={{ width: `${(summary.byStatus[s] / summary.total) * 100}%` }} /> : null)}
                </div>
                <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-5">
                  {TASK_STATUSES.map((s) => (
                    <li key={s} className="flex items-center gap-2"><span className={cn("size-2 rounded-full", SEGMENT[s])} aria-hidden /><span className="text-muted-foreground">{statusLabel.task(s)}</span><span className="ml-auto tabular-nums sm:ml-1">{summary.byStatus[s]}</span></li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section aria-labelledby="ov-attention" className="rounded-lg border border-border bg-surface">
            <h2 id="ov-attention" className="px-4 pt-4 text-sm font-semibold">Needs attention</h2>
            {summary.attention.length === 0 ? (
              <p className="flex items-center gap-2 px-4 pb-4 pt-2 text-sm text-muted-foreground"><CircleCheck className="size-4 text-success" aria-hidden />No overdue, urgent or high-priority tasks open.</p>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {summary.attention.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <Link href={taskHref(t.id)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-muted">
                      <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                      <ScheduleBadge schedule={taskSchedule(t)} />
                      <PriorityBadge priority={t.priority} />
                      {t.assigneeMembershipId ? <Avatar name={directory.nameOf(t.assigneeMembershipId)} size="sm" /> : <span className="text-xs text-muted-foreground">Unassigned</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {summary.attention.length > 5 ? <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">+{summary.attention.length - 5} more in the Tasks tab</p> : null}
          </section>
        </div>

        <div className="space-y-6">
          <section aria-labelledby="ov-sprint" className="rounded-lg border border-border bg-surface p-4">
            <h2 id="ov-sprint" className="text-sm font-semibold">{focus?.kind === "upcoming" ? "Next sprint" : "Current sprint"}</h2>
            {focus && sprintProgress ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-2"><p className="font-medium">{focus.sprint.name}</p><SprintStatusBadge status={focus.sprint.status} /></div>
                <p className="text-sm text-muted-foreground">{formatCalendarDate(focus.sprint.startDate)} → {formatCalendarDate(focus.sprint.endDate)}</p>
                {focus.sprint.goal ? <p className="text-sm">{focus.sprint.goal}</p> : null}
                <div className="space-y-1">
                  <Progress value={sprintProgress.pct} label="Sprint tasks done" />
                  <p className="text-xs text-muted-foreground">{sprintProgress.total ? `${sprintProgress.done} of ${sprintProgress.total} sprint tasks done` : "No tasks are planned into this sprint yet"}</p>
                </div>
                {elapsed !== null ? <p className="text-xs text-muted-foreground">{Math.round(elapsed)}% of the time window elapsed</p> : null}
              </div>
            ) : (
              <div className="mt-3"><EmptyState icon={CalendarRange} title="No active sprint" description="Plan a sprint in the Sprints tab to time-box the work." /></div>
            )}
          </section>

          <section aria-labelledby="ov-people" className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <h2 id="ov-people" className="text-sm font-semibold">People &amp; teams</h2>
              <button type="button" onClick={() => onOpenTab("people")} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">Manage <ArrowRight className="size-3" aria-hidden /></button>
            </div>
            <div className="mt-3 space-y-3 text-sm">
              {membersQ.isLoading ? <Skeleton className="h-6 w-32" /> : memberNames.length ? (
                <div className="flex items-center gap-2"><AvatarStack names={memberNames} /><span className="text-muted-foreground">{memberNames.length} {memberNames.length === 1 ? "person" : "people"}</span></div>
              ) : (
                <p className="flex items-center gap-2 text-muted-foreground"><UsersRound className="size-4" aria-hidden />No one is on this project yet.</p>
              )}
              {teamsQ.data?.length ? (
                <ul className="flex flex-wrap gap-1.5" aria-label="Assigned teams">
                  {teamsQ.data.map((pt) => <li key={pt.id} className="rounded-sm bg-surface-muted px-2 py-0.5 text-xs">{teamDir.exists(pt.teamId) ? teamDir.nameOf(pt.teamId) : "Deleted team"}</li>)}
                </ul>
              ) : <p className="text-muted-foreground">No teams assigned.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
