"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/services";
import { toErrorMessage } from "@/lib/api/errors";
import { extractFieldErrors } from "@/lib/api/field-errors";
import { useAuth } from "./auth-provider";
import { changePasswordSchema, type ChangePasswordValues } from "./schemas";

const FIELDS = [
  { name: "currentPassword", label: "Current password", autoComplete: "current-password", hint: "" },
  { name: "newPassword", label: "New password", autoComplete: "new-password", hint: "8–72 characters." },
  { name: "confirmPassword", label: "Confirm new password", autoComplete: "new-password", hint: "" },
] as const;

/** Changing the password revokes every session (this one too), so success ends with a fresh sign-in. */
export function ChangePasswordForm() {
  const { logout } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  return (
    <form noValidate className="max-w-md space-y-4" onSubmit={handleSubmit(async ({ currentPassword, newPassword }) => {
      setServerError(null);
      try {
        await authApi.changePassword(currentPassword, newPassword);
        toast.success("Password changed. Please sign in again.");
        await logout().catch(() => undefined);
      } catch (e) {
        const fields = extractFieldErrors(e, ["currentPassword", "newPassword"] as const);
        const mapped = Object.entries(fields) as [keyof typeof fields & string, string][];
        if (mapped.length) { for (const [f, message] of mapped) setError(f as "currentPassword" | "newPassword", { type: "server", message }); return; }
        const m = toErrorMessage(e); setServerError(m); toast.error(m);
      }
    })}>
      {FIELDS.map((f) => (
        <div key={f.name} className="space-y-1.5">
          <Label htmlFor={f.name}>{f.label}</Label>
          <Input id={f.name} type="password" autoComplete={f.autoComplete} aria-invalid={!!errors[f.name]} aria-describedby={`${f.name}-msg`} {...register(f.name)} />
          <p id={`${f.name}-msg`} className={errors[f.name] ? "text-xs text-danger" : "text-xs text-muted-foreground"}>{errors[f.name] ? errors[f.name]?.message : f.hint}</p>
        </div>
      ))}
      {serverError ? <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{serverError}</p> : null}
      <p className="text-xs text-muted-foreground">You&apos;ll be signed out on all devices. Signed up with Google or GitHub and never set a password? Use “Forgot password” on the sign-in page to create one.</p>
      <Button type="submit" loading={isSubmitting}>Change password</Button>
    </form>
  );
}
