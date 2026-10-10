import { z } from "zod";

// Mirrors the backend createTeamSchema / updateTeamSchema (name 1–150, description ≤ 2000).
// Names are unique per organization; that is enforced server-side and surfaced on the field (409).
export const teamSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150, "Name is too long"),
  description: z.string().trim().max(2000, "Description is too long").optional(),
});
export type TeamValues = z.infer<typeof teamSchema>;
