import { z } from "zod";
export const taskSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(200, "Title is too long"),
  description: z.string().trim().max(5000, "Description is too long").optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeMembershipId: z.string().optional(),
});
export type TaskValues = z.infer<typeof taskSchema>;

export const commentSchema = z.object({ content: z.string().trim().min(1, "Write something first").max(4000, "Comment is too long") });
export const sprintSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name is too long"),
  goal: z.string().trim().max(500, "Goal is too long").optional(),
  startDate: z.string().min(1, "Choose a start date"),
  endDate: z.string().min(1, "Choose an end date"),
}).refine((v) => !v.startDate || !v.endDate || new Date(v.endDate) >= new Date(v.startDate), { path: ["endDate"], message: "End date must be on or after the start date" });
export type SprintValues = z.infer<typeof sprintSchema>;
