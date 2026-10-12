import { z } from "zod";
export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300, "Title is too long"),
  description: z.string().trim().max(10000, "Description is too long").optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeMembershipId: z.string().optional(),
});
export type TaskValues = z.infer<typeof taskSchema>;

export const commentSchema = z.object({ content: z.string().trim().min(1, "Write something first").max(10000, "Comment is too long") });
