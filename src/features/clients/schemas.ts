import { z } from "zod";

// Mirrors client.validation.ts: name 2–150, website a valid URL (≤2048), notes ≤5000;
// contact: name 2–150, e-mail ≤254, jobTitle ≤150. Blank optionals are simply not sent.
const name = z.string().trim().min(2, "Name must be at least 2 characters").max(150, "Name is too long");

export const clientSchema = z.object({
  name,
  website: z.string().trim().max(2048, "URL is too long").refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v) && URL.canParse(v), "Enter a valid URL, e.g. https://example.com"),
  notes: z.string().trim().max(5000, "Notes are too long"),
});
export type ClientValues = z.infer<typeof clientSchema>;

export const contactSchema = z.object({
  name,
  email: z.string().trim().min(1, "Email is required").max(254, "Email is too long").email("Enter a valid email"),
  jobTitle: z.string().trim().max(150, "Job title is too long"),
});
export type ContactValues = z.infer<typeof contactSchema>;
