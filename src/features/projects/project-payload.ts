import { fromDateInputValue, toDateInputValue } from "@/lib/format";
import type { ProjectInput } from "@/lib/api/services";
import type { Project } from "@/types/domain";
import type { ProjectValues } from "./schemas";

export type ProjectPayloadResult =
  | { ok: true; payload: ProjectInput & { name: string } }
  | { ok: false; field: "startDate" | "dueDate"; message: string };

/**
 * Turns form values into the request body.
 *
 * Backend rules this respects (project.validation.ts / project.service.ts):
 * - Dates are optional on create and can be changed on update, but there is no way to CLEAR one
 *   (null is rejected), so clearing a date that is already set is refused here with a clear message.
 * - The "due on or after start" check only runs when BOTH dates are in the body, so on edit both are
 *   sent whenever either is set; otherwise changing one date could bypass the check.
 * - Description is sent as "" to clear it (null is rejected).
 */
export function buildProjectPayload(values: ProjectValues, original?: Project): ProjectPayloadResult {
  const start = values.startDate ?? "";
  const due = values.dueDate ?? "";

  if (original) {
    if (!start && toDateInputValue(original.startDate)) return { ok: false, field: "startDate", message: "A start date can be changed but not removed" };
    if (!due && toDateInputValue(original.dueDate)) return { ok: false, field: "dueDate", message: "A due date can be changed but not removed" };
  }

  const payload: ProjectInput & { name: string } = { name: values.name.trim() };
  const description = values.description?.trim() ?? "";
  if (original) payload.description = description;
  else if (description) payload.description = description;
  if (start) payload.startDate = fromDateInputValue(start);
  if (due) payload.dueDate = fromDateInputValue(due);
  return { ok: true, payload };
}
