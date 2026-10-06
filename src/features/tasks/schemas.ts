import { z } from "zod";
export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300, "Title is too long"),
  description: z.string().trim().max(10000, "Description is too long").optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeMembershipId: z.string().optional(),
});
export type TaskValues = z.infer<typeof taskSchema>;

export const commentSchema = z.object({ content: z.string().trim().min(1, "Write something first").max(10000, "Comment is too long") });
export const sprintSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150, "Name is too long"),
  goal: z.string().trim().max(2000, "Goal is too long").optional(),
  startDate: z.string().min(1, "Choose a start date"),
  endDate: z.string().min(1, "Choose an end date"),
}).refine((v) => !v.startDate || !v.endDate || new Date(v.endDate) >= new Date(v.startDate), { path: ["endDate"], message: "End date must be on or after the start date" });
export type SprintValues = z.infer<typeof sprintSchema>;
