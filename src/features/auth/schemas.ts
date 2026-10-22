import { z } from "zod";

// Mirrors the backend (agencyops-api src/modules/auth/auth.validation.ts):
//   name 1–150 · valid email · password 8–72 characters AND at most 72 UTF-8 bytes (bcrypt ignores the rest), no composition rules.
// The backend remains authoritative; its messages are shown on submit if they differ.
const utf8Bytes = (v: string) => new TextEncoder().encode(v).length;
/** The backend's passwordSchema. */
export const newPasswordField = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .refine((v) => utf8Bytes(v) <= 72, "Password is too long");

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(150, "Name is too long"),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
    password: newPasswordField,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({ password: newPasswordField, confirmPassword: z.string().min(1, "Confirm your password") })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "Current password is required"), newPassword: newPasswordField, confirmPassword: z.string().min(1, "Confirm your new password") })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords don't match" })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], message: "The new password must be different from the current one" });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const DELETE_CONFIRMATION = "DELETE";
export const deleteAccountSchema = z.object({
  password: z.string().optional(),
  confirmation: z.string().refine((v) => v.trim() === DELETE_CONFIRMATION, `Type ${DELETE_CONFIRMATION} in capitals to continue`),
});
export type DeleteAccountValues = z.infer<typeof deleteAccountSchema>;
