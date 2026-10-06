import { z } from "zod";

// Mirrors the backend (agencyops-api src/modules/auth/auth.validation.ts):
//   name 1–150 · valid email · password 8–128 with NO composition rules.
// The backend remains authoritative; its messages are shown on submit if they differ.
export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(150, "Name is too long"),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be at most 128 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });
export type RegisterValues = z.infer<typeof registerSchema>;
