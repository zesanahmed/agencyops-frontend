import { z } from "zod";
export const organizationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80, "Name is too long"),
});
export type OrganizationValues = z.infer<typeof organizationSchema>;
