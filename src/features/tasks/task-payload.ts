import { fromDateInputValue, toDateInputValue } from "@/lib/format";
import type { TaskInput } from "@/lib/api/services";
import type { Task } from "@/types/domain";
import type { TaskValues } from "./schemas";

export type TaskPayloadResult =
  | { ok: true; payload: TaskInput & { title: string } }
  | { ok: false; field: "startDate" | "dueDate"; message: string };

/**
 * Form values -> request body.
 *
 * Backend rules respected here (task.validation.ts):
 * - sprint and assignee can be set to `null` on update to clear them, but are simply omitted on create.
 * - description is sent as "" to clear it.
 * - dates are cleared with `null` (the final backend's clearableDate); an empty date is omitted on create. The
 *   start/due order check also runs against the stored value on a partial update.
 */
export function buildTaskPayload(v: TaskValues, original?: Task): TaskPayloadResult {
  const start = v.startDate ?? "";
  const due = v.dueDate ?? "";
  const payload: TaskInput & { title: string } = { title: v.title.trim(), priority: v.priority };
  const description = v.description?.trim() ?? "";
  if (original) payload.description = description;
  else if (description) payload.description = description;
  if (original) {
    payload.assigneeMembershipId = v.assigneeMembershipId || null;
    payload.sprintId = v.sprintId || null;
  } else {
    if (v.assigneeMembershipId) payload.assigneeMembershipId = v.assigneeMembershipId;
    if (v.sprintId) payload.sprintId = v.sprintId;
  }
  if (start) payload.startDate = fromDateInputValue(start);
  else if (original && toDateInputValue(original.startDate)) payload.startDate = null;
  if (due) payload.dueDate = fromDateInputValue(due);
  else if (original && toDateInputValue(original.dueDate)) payload.dueDate = null;
  return { ok: true, payload };
}
