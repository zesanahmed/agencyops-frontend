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
 * - Dates are optional. The final backend accepts `null` to CLEAR one (clearableDate), so on edit a date the user
 *   emptied is sent as null; on create an empty date is simply omitted.
 * - The "due on or after start" check only runs when BOTH dates are in the body, so on edit both are
 *   sent whenever either is set; otherwise changing one date could bypass the check.
 * - Description is sent as "" to clear it (null is rejected).
 */
export function buildProjectPayload(values: ProjectValues, original?: Project): ProjectPayloadResult {
  const start = values.startDate ?? "";
  const due = values.dueDate ?? "";

  const payload: ProjectInput & { name: string } = { name: values.name.trim() };
  const description = values.description?.trim() ?? "";
  if (original) payload.description = description;
  else if (description) payload.description = description;
  if (start) payload.startDate = fromDateInputValue(start);
  else if (original && toDateInputValue(original.startDate)) payload.startDate = null;
  if (due) payload.dueDate = fromDateInputValue(due);
  else if (original && toDateInputValue(original.dueDate)) payload.dueDate = null;
  return { ok: true, payload };
}
