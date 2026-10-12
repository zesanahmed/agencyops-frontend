import { describe, expect, it } from "vitest";
import { buildTaskPayload } from "./task-payload";
import { taskSchema } from "./schemas";
import type { Task } from "@/types/domain";

const task = (o: Partial<Task> = {}): Task => ({
  id: "t1", projectId: "p1", sprintId: "s1", parentTaskId: null, assigneeMembershipId: "m1", title: "Old", description: "Old desc",
  status: "TODO", priority: "HIGH", startDate: "2026-01-01T00:00:00.000Z", dueDate: "2026-01-10T00:00:00.000Z", createdAt: "", ...o,
});
const base = { title: "T", priority: "MEDIUM" as const };

describe("taskSchema", () => {
  it("requires a title and bounds title (300) and description (10000)", () => {
    expect(taskSchema.safeParse({ ...base, title: " " }).success).toBe(false);
    expect(taskSchema.safeParse({ ...base, title: "x".repeat(301) }).success).toBe(false);
    expect(taskSchema.safeParse({ ...base, description: "x".repeat(10001) }).success).toBe(false);
    expect(taskSchema.safeParse(base).success).toBe(true);
  });
  it("rejects a due date before the start date on the due date field", () => {
    const r = taskSchema.safeParse({ ...base, startDate: "2026-02-02", dueDate: "2026-02-01" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["dueDate"]);
  });
});

describe("buildTaskPayload", () => {
  it("create: omits empty optional fields and sends dates as UTC midnight", () => {
    expect(buildTaskPayload({ ...base, description: "", assigneeMembershipId: "", sprintId: "", startDate: "", dueDate: "" })).toEqual({ ok: true, payload: { title: "T", priority: "MEDIUM" } });
    expect(buildTaskPayload({ ...base, title: " Build ", description: "Do it", assigneeMembershipId: "m2", sprintId: "s2", startDate: "2026-03-01", dueDate: "2026-03-05" })).toEqual({
      ok: true, payload: { title: "Build", priority: "MEDIUM", description: "Do it", assigneeMembershipId: "m2", sprintId: "s2", startDate: "2026-03-01T00:00:00.000Z", dueDate: "2026-03-05T00:00:00.000Z" },
    });
  });
  it("edit: clears assignee, sprint and description with null / \"\" and keeps both dates", () => {
    expect(buildTaskPayload({ ...base, description: "", assigneeMembershipId: "", sprintId: "", startDate: "2026-01-01", dueDate: "2026-01-12" }, task())).toEqual({
      ok: true, payload: { title: "T", priority: "MEDIUM", description: "", assigneeMembershipId: null, sprintId: null, startDate: "2026-01-01T00:00:00.000Z", dueDate: "2026-01-12T00:00:00.000Z" },
    });
  });
  it("edit: refuses to clear a date that is already set (the backend would store 1970)", () => {
    expect(buildTaskPayload({ ...base, startDate: "", dueDate: "2026-01-10" }, task())).toMatchObject({ ok: false, field: "startDate" });
    expect(buildTaskPayload({ ...base, startDate: "2026-01-01", dueDate: "" }, task())).toMatchObject({ ok: false, field: "dueDate" });
    expect(buildTaskPayload({ ...base, startDate: "", dueDate: "" }, task({ startDate: null, dueDate: null }))).toMatchObject({ ok: true });
  });
});
