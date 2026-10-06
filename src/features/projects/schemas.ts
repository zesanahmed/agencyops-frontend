import { z } from "zod";
export const projectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200, "Name is too long"),
  description: z.string().trim().max(5000, "Description is too long").optional(),
});
export type ProjectValues = z.infer<typeof projectSchema>;
