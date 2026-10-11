import { z } from "zod";

/**
 * Mirrors the backend's create/update project schema (project.validation.ts): name 1-200,
 * description up to 5000, and dueDate on or after startDate. Dates are `YYYY-MM-DD` strings
 * from date inputs; "" means "not set".
 */
export const projectSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(200, "Name is too long"),
    description: z.string().trim().max(5000, "Description is too long").optional(),
    startDate: z.string().optional(),
    dueDate: z.string().optional(),
  })
  .refine((v) => !v.startDate || !v.dueDate || v.dueDate >= v.startDate, {
    path: ["dueDate"],
    message: "Due date must be on or after the start date",
  });
export type ProjectValues = z.infer<typeof projectSchema>;
