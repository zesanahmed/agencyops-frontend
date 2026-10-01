import { z } from "zod";
export const projectSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120, "Name is too long"),
  description: z.string().trim().max(2000, "Description is too long").optional(),
});
export type ProjectValues = z.infer<typeof projectSchema>;
