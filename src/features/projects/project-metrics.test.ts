import { describe, expect, it } from "vitest";
import { dueSchedule, pickFocusSprint, projectSchedule, taskSchedule, scheduleLabel, sprintTaskProgress, summarizeTasks, timeElapsedPct } from "./project-metrics";
import type { Sprint, Task } from "@/types/domain";

const task = (o: Partial<Task>): Task => ({
  id: "t", projectId: "p", sprintId: null, parentTaskId: null, assigneeMembershipId: "m1", title: "T", description: null,
  status: "TODO", priority: "MEDIUM", startDate: null, dueDate: null, createdAt: "", ...o,
});
const sprint = (o: Partial<Sprint>): Sprint => ({ id: "s", projectId: "p", name: "S", goal: null, status: "PLANNED", startDate: "2026-01-01T00:00:00Z", endDate: "2026-01-14T00:00:00Z", ...o });

describe("summarizeTasks", () => {
  it("counts by status, completion, unassigned open work, and ranks urgent before high", () => {
    const s = summarizeTasks([
      task({ id: "1", status: "DONE", priority: "URGENT" }),
      task({ id: "2", status: "IN_PROGRESS", priority: "HIGH" }),
      task({ id: "3", status: "TODO", priority: "URGENT", assigneeMembershipId: null }),
      task({ id: "4", status: "BACKLOG", priority: "LOW", assigneeMembershipId: null }),
    ]);
    expect(s).toMatchObject({ total: 4, done: 1, open: 3, pct: 25, unassigned: 2 });
    expect(s.byStatus).toEqual({ BACKLOG: 1, TODO: 1, IN_PROGRESS: 1, IN_REVIEW: 0, DONE: 1 });
    expect(s.attention.map((t) => t.id)).toEqual(["3", "2"]); // the done urgent task is not "attention"
  });

  it("is all zeros for a project with no tasks", () => {
    expect(summarizeTasks([])).toMatchObject({ total: 0, done: 0, open: 0, pct: 0, unassigned: 0, attention: [] });
  });
});

describe("projectSchedule", () => {
  const NOW = Date.UTC(2026, 5, 10, 15, 30); // 10 Jun 2026, mid-afternoon
  const due = (iso: string, status: "ACTIVE" | "COMPLETED" | "CANCELLED" | "PLANNING" = "ACTIVE") => projectSchedule({ status, dueDate: iso }, NOW);

  it("compares UTC calendar days, so a project due today is due today (not overdue) all day", () => {
    expect(due("2026-06-10T00:00:00.000Z")).toEqual({ state: "due-soon", daysLeft: 0 });
  });
  it("flags overdue, due soon (within 7 days) and on track", () => {
    expect(due("2026-06-09T00:00:00.000Z")).toEqual({ state: "overdue", daysLeft: -1 });
    expect(due("2026-06-17T00:00:00.000Z")).toEqual({ state: "due-soon", daysLeft: 7 });
    expect(due("2026-06-18T00:00:00.000Z")).toEqual({ state: "on-track", daysLeft: 8 });
  });
  it("never calls a completed or cancelled project overdue, and handles a missing date", () => {
    expect(due("2020-01-01T00:00:00.000Z", "COMPLETED").state).toBe("closed");
    expect(due("2020-01-01T00:00:00.000Z", "CANCELLED").state).toBe("closed");
    expect(projectSchedule({ status: "ACTIVE", dueDate: null }, NOW).state).toBe("no-date");
    expect(projectSchedule({ status: "ACTIVE", dueDate: "garbage" }, NOW).state).toBe("no-date");
  });
  it("words the label", () => {
    expect(scheduleLabel({ state: "overdue", daysLeft: -1 })).toBe("1 day overdue");
    expect(scheduleLabel({ state: "overdue", daysLeft: -5 })).toBe("5 days overdue");
    expect(scheduleLabel({ state: "due-soon", daysLeft: 0 })).toBe("Due today");
    expect(scheduleLabel({ state: "on-track", daysLeft: 12 })).toBe("Due in 12 days");
    expect(scheduleLabel({ state: "no-date", daysLeft: null })).toBe("");
  });
});

describe("timeElapsedPct", () => {
  it("is the clamped fraction of the window", () => {
    const a = "2026-01-01T00:00:00Z"; const b = "2026-01-11T00:00:00Z";
    expect(timeElapsedPct(a, b, Date.UTC(2026, 0, 6))).toBe(50);
    expect(timeElapsedPct(a, b, Date.UTC(2025, 11, 1))).toBe(0);
    expect(timeElapsedPct(a, b, Date.UTC(2026, 5, 1))).toBe(100);
  });
  it("is null for missing or inverted ranges", () => {
    expect(timeElapsedPct(null, "2026-01-11T00:00:00Z")).toBeNull();
    expect(timeElapsedPct("2026-01-11T00:00:00Z", "2026-01-01T00:00:00Z")).toBeNull();
  });
});

describe("pickFocusSprint / sprintTaskProgress", () => {
  it("prefers the active sprint, then the earliest planned one, else nothing", () => {
    expect(pickFocusSprint([sprint({ id: "a", status: "COMPLETED" }), sprint({ id: "b", status: "ACTIVE" }), sprint({ id: "c" })])).toMatchObject({ kind: "active", sprint: { id: "b" } });
    expect(pickFocusSprint([sprint({ id: "late", startDate: "2026-03-01T00:00:00Z" }), sprint({ id: "soon", startDate: "2026-02-01T00:00:00Z" })])).toMatchObject({ kind: "upcoming", sprint: { id: "soon" } });
    expect(pickFocusSprint([sprint({ status: "COMPLETED" })])).toBeNull();
    expect(pickFocusSprint([])).toBeNull();
  });
  it("measures completion only within the sprint", () => {
    const tasks = [task({ sprintId: "s", status: "DONE" }), task({ sprintId: "s", status: "TODO" }), task({ sprintId: "other", status: "DONE" }), task({ sprintId: null })];
    expect(sprintTaskProgress(tasks, "s")).toEqual({ total: 2, done: 1, pct: 50 });
    expect(sprintTaskProgress(tasks, "none")).toEqual({ total: 0, done: 0, pct: 0 });
  });
});

describe("taskSchedule / dueSchedule", () => {
  const NOW = Date.UTC(2026, 5, 10, 22, 0);
  it("flags an open task past its due day as overdue, but a done task never", () => {
    expect(taskSchedule({ status: "IN_PROGRESS", dueDate: "2026-06-09T00:00:00.000Z" }, NOW)).toEqual({ state: "overdue", daysLeft: -1 });
    expect(taskSchedule({ status: "DONE", dueDate: "2026-06-09T00:00:00.000Z" }, NOW).state).toBe("closed");
    expect(taskSchedule({ status: "TODO", dueDate: null }, NOW).state).toBe("no-date");
  });
  it("treats the due day itself as due today (late evening UTC is still that day)", () => {
    expect(dueSchedule("2026-06-10T00:00:00.000Z", false, NOW)).toEqual({ state: "due-soon", daysLeft: 0 });
  });
});
