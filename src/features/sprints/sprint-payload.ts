import { fromDateInputValue } from "@/lib/format";
import type { SprintInput } from "@/lib/api/services";
import type { SprintValues } from "./schemas";

/**
 * Form values -> request body. Dates go out as UTC-midnight ISO strings (the same convention as project
 * dates), so a sprint starts on the same calendar day for everyone regardless of their time zone. On edit the
 * goal is always sent ("" clears it) and so are both dates, because the backend only checks their order when both are present.
 */
export function buildSprintPayload(v: SprintValues, editing: boolean): SprintInput {
  const goal = v.goal?.trim() ?? "";
  return {
    name: v.name.trim(),
    ...(editing || goal ? { goal } : {}),
    startDate: fromDateInputValue(v.startDate),
    endDate: fromDateInputValue(v.endDate),
  };
}
