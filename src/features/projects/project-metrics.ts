import { TASK_STATUSES, type Project, type Sprint, type Task, type TaskStatus } from "@/types/domain";

const DAY = 86_400_000;

export interface TaskSummary {
  total: number;
  done: number;
  open: number;
  /** Whole-number completion percentage; 0 when there are no tasks. */
  pct: number;
  byStatus: Record<TaskStatus, number>;
  /** Open tasks nobody is assigned to. */
  unassigned: number;
  /** Open URGENT then HIGH tasks, most urgent first: the work most likely to need a look. */
  attention: Task[];
}

/** Summarises top-level tasks (the backend task list never includes subtasks). */
export function summarizeTasks(tasks: Task[]): TaskSummary {
  const byStatus = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0])) as Record<TaskStatus, number>;
  for (const t of tasks) byStatus[t.status] += 1;
  const total = tasks.length;
  const done = byStatus.DONE;
  const open = tasks.filter((t) => t.status !== "DONE");
  const rank = (t: Task) => (t.priority === "URGENT" ? 0 : 1);
  return {
    total,
    done,
    open: open.length,
    pct: total === 0 ? 0 : Math.round((done / total) * 100),
    byStatus,
    unassigned: open.filter((t) => !t.assigneeMembershipId).length,
    attention: open.filter((t) => t.priority === "URGENT" || t.priority === "HIGH").sort((a, b) => rank(a) - rank(b)),
  };
}

export type ScheduleState = "overdue" | "due-soon" | "on-track" | "no-date" | "closed";
export interface Schedule { state: ScheduleState; daysLeft: number | null }

/** Days within which an open project's due date counts as "due soon". */
export const DUE_SOON_DAYS = 7;

/**
 * Where a project stands against its due date. Dates are UTC calendar days, so "today" is compared
 * as a UTC day too. Completed and cancelled projects are never overdue.
 */
export function projectSchedule(project: Pick<Project, "status" | "dueDate">, now: number = Date.now()): Schedule {
  if (project.status === "COMPLETED" || project.status === "CANCELLED") return { state: "closed", daysLeft: null };
  if (!project.dueDate) return { state: "no-date", daysLeft: null };
  const due = new Date(project.dueDate).getTime();
  if (Number.isNaN(due)) return { state: "no-date", daysLeft: null };
  const dueDay = Math.floor(due / DAY);
  const today = Math.floor(now / DAY);
  const daysLeft = dueDay - today;
  if (daysLeft < 0) return { state: "overdue", daysLeft };
  return { state: daysLeft <= DUE_SOON_DAYS ? "due-soon" : "on-track", daysLeft };
}

/** Short human text for a schedule, e.g. "Due in 3 days" / "5 days overdue". */
export function scheduleLabel(s: Schedule): string {
  if (s.daysLeft === null) return "";
  const n = Math.abs(s.daysLeft);
  const days = `${n} ${n === 1 ? "day" : "days"}`;
  if (s.daysLeft < 0) return `${days} overdue`;
  if (s.daysLeft === 0) return "Due today";
  return `Due in ${days}`;
}

/** Fraction (0-100) of a date range that has elapsed — a schedule signal, not completion. */
export function timeElapsedPct(startDate: string | null, endDate: string | null, now: number = Date.now()): number | null {
  if (!startDate || !endDate) return null;
  const a = new Date(startDate).getTime();
  const b = new Date(endDate).getTime();
  if (!(b > a)) return null;
  return Math.max(0, Math.min(100, ((now - a) / (b - a)) * 100));
}

export interface FocusSprint { sprint: Sprint; kind: "active" | "upcoming" }

/** The sprint worth showing on the overview: the active one, else the next planned one. */
export function pickFocusSprint(sprints: Sprint[]): FocusSprint | null {
  const active = sprints.find((s) => s.status === "ACTIVE");
  if (active) return { sprint: active, kind: "active" };
  const upcoming = sprints.filter((s) => s.status === "PLANNED").sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  return upcoming ? { sprint: upcoming, kind: "upcoming" } : null;
}

/** Task completion inside one sprint. */
export function sprintTaskProgress(tasks: Task[], sprintId: string): { total: number; done: number; pct: number } {
  const inSprint = tasks.filter((t) => t.sprintId === sprintId);
  const done = inSprint.filter((t) => t.status === "DONE").length;
  return { total: inSprint.length, done, pct: inSprint.length === 0 ? 0 : Math.round((done / inSprint.length) * 100) };
}
