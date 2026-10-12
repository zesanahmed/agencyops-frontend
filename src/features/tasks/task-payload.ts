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
 * - dates cannot be cleared (the backend coerces `null` to 1 Jan 1970), so clearing a date that is set is refused here;
 *   and the start/due order check only runs when BOTH are in the body, so both are sent whenever set.
 */
export function buildTaskPayload(v: TaskValues, original?: Task): TaskPayloadResult {
  const start = v.startDate ?? "";
  const due = v.dueDate ?? "";
  if (original) {
    if (!start && toDateInputValue(original.startDate)) return { ok: false, field: "startDate", message: "A start date can be changed but not removed" };
    if (!due && toDateInputValue(original.dueDate)) return { ok: false, field: "dueDate", message: "A due date can be changed but not removed" };
  }
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
  if (due) payload.dueDate = fromDateInputValue(due);
  return { ok: true, payload };
}
