import { z } from "zod";

/**
 * Mirrors the backend's task schema: title 1-300, description up to 10000, dueDate on or after startDate.
 * Dates are `YYYY-MM-DD` strings from date inputs; "" means "not set". Sprint/assignee "" means none.
 */
export const taskSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(300, "Title is too long"),
    description: z.string().trim().max(10000, "Description is too long").optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
    assigneeMembershipId: z.string().optional(),
    sprintId: z.string().optional(),
    startDate: z.string().optional(),
    dueDate: z.string().optional(),
  })
  .refine((v) => !v.startDate || !v.dueDate || v.dueDate >= v.startDate, { path: ["dueDate"], message: "Due date must be on or after the start date" });
export type TaskValues = z.infer<typeof taskSchema>;

export const commentSchema = z.object({ content: z.string().trim().min(1, "Write something first").max(10000, "Comment is too long") });
