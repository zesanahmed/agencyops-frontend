import { z } from "zod";

/** Mirrors the backend's sprint schema: name 1-150, goal up to 2000, both dates required, end on or after start. */
export const sprintSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(150, "Name is too long"),
    goal: z.string().trim().max(2000, "Goal is too long").optional(),
    startDate: z.string().min(1, "Choose a start date"),
    endDate: z.string().min(1, "Choose an end date"),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, { path: ["endDate"], message: "End date must be on or after the start date" });
export type SprintValues = z.infer<typeof sprintSchema>;
