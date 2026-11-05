import { z } from "zod";
import { newPasswordField } from "@/features/auth/schemas";

// Mirrors portal.validation.ts: login = organizationSlug (≤150, lower-cased by the server), e-mail, password (presence only);
// accept-invite = one-time token (from the link) + a password under the standard policy (8–72 chars / ≤72 bytes).
export const portalLoginSchema = z.object({
  organizationSlug: z.string().trim().min(1, "Enter your agency's portal name").max(150, "That name is too long").regex(/^[a-zA-Z0-9-]+$/, "Use letters, numbers and dashes only"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(254),
  password: z.string().min(1, "Password is required"),
});
export type PortalLoginValues = z.infer<typeof portalLoginSchema>;

export const acceptInviteSchema = z
  .object({ password: newPasswordField, confirmPassword: z.string().min(1, "Confirm your password") })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });
export type AcceptInviteValues = z.infer<typeof acceptInviteSchema>;
