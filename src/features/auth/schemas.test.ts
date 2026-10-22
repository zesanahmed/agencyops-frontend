import { describe, expect, it } from "vitest";
import { changePasswordSchema, deleteAccountSchema, forgotPasswordSchema, newPasswordField, registerSchema, resetPasswordSchema } from "./schemas";

const msgs = (r: { success: boolean; error?: { issues: { message: string }[] } }) => (r.success ? [] : r.error!.issues.map((i) => i.message));

describe("password policy (mirrors the backend: 8–72 chars, ≤72 UTF-8 bytes, no composition rules)", () => {
  it("accepts the boundaries and any character mix", () => {
    expect(newPasswordField.safeParse("abcdefgh").success).toBe(true);
    expect(newPasswordField.safeParse("a".repeat(72)).success).toBe(true);
  });
  it("rejects too short / too long", () => {
    expect(msgs(newPasswordField.safeParse("short"))).toEqual(["Password must be at least 8 characters"]);
    expect(msgs(newPasswordField.safeParse("a".repeat(73)))).toContain("Password must be at most 72 characters");
  });
  it("counts bytes, not characters (bcrypt ignores everything past 72 bytes)", () => {
    expect(msgs(newPasswordField.safeParse("é".repeat(40)))).toEqual(["Password is too long"]); // 40 chars = 80 bytes
    expect(newPasswordField.safeParse("é".repeat(36)).success).toBe(true); // 72 bytes
  });
  it("register uses the same rule", () => {
    expect(registerSchema.safeParse({ name: "A", email: "a@b.co", password: "a".repeat(100), confirmPassword: "a".repeat(100) }).success).toBe(false);
  });
});

describe("account forms", () => {
  it("forgot-password needs a valid e-mail", () => {
    expect(msgs(forgotPasswordSchema.safeParse({ email: "" }))[0]).toBe("Email is required"); // the form shows the first issue
    expect(forgotPasswordSchema.safeParse({ email: " a@b.co " }).success).toBe(true);
  });
  it("reset-password requires matching passwords", () => {
    expect(msgs(resetPasswordSchema.safeParse({ password: "password-1", confirmPassword: "password-2" }))).toEqual(["Passwords don't match"]);
    expect(resetPasswordSchema.safeParse({ password: "password-1", confirmPassword: "password-1" }).success).toBe(true);
  });
  it("change-password: new must match its confirmation and differ from the current one", () => {
    expect(msgs(changePasswordSchema.safeParse({ currentPassword: "same-password", newPassword: "same-password", confirmPassword: "same-password" }))).toEqual(["The new password must be different from the current one"]);
    expect(msgs(changePasswordSchema.safeParse({ currentPassword: "old-password", newPassword: "new-password", confirmPassword: "other-password" }))).toEqual(["Passwords don't match"]);
    expect(msgs(changePasswordSchema.safeParse({ currentPassword: "", newPassword: "new-password", confirmPassword: "new-password" }))).toEqual(["Current password is required"]);
  });
  it("delete-account needs the typed confirmation; the password is optional (OAuth-only accounts)", () => {
    expect(deleteAccountSchema.safeParse({ password: "", confirmation: "DELETE" }).success).toBe(true);
    expect(msgs(deleteAccountSchema.safeParse({ confirmation: "delete" }))).toEqual(["Type DELETE in capitals to continue"]);
  });
});
