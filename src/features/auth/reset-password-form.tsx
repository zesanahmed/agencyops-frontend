"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/services";
import { ApiError, toErrorMessage } from "@/lib/api/errors";
import { extractFieldErrors } from "@/lib/api/field-errors";
import { resetPasswordSchema, type ResetPasswordValues } from "./schemas";

/** The link e-mailed by the backend: /reset-password?token=…. Tokens are single-use and expire. */
export function ResetPasswordForm() {
  const token = useSearchParams().get("token")?.trim() ?? "";
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  if (!token || linkInvalid)
    return (
      <div className="space-y-4" role="alert">
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{token ? "This reset link is invalid or has expired." : "This page needs the link from your reset e-mail."}</p>
        <p className="text-sm text-muted-foreground">Reset links work once and expire. Request a new one to continue.</p>
        <Link href="/forgot-password" className="inline-block text-sm font-medium text-primary hover:underline">Request a new link</Link>
      </div>
    );

  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit(async ({ password }) => {
      setServerError(null);
      try {
        await authApi.resetPassword(token, password);
        toast.success("Password reset. Sign in with your new password.");
        router.replace("/login");
      } catch (e) {
        const fields = extractFieldErrors(e, ["password", "token"] as const);
        if (fields.password) { setError("password", { type: "server", message: fields.password }); return; }
        // A bad, used or expired token is a 400 "This link is invalid or has expired" (or a malformed-token validation error).
        if (fields.token || (e instanceof ApiError && e.status === 400)) { setLinkInvalid(true); return; }
        const m = toErrorMessage(e); setServerError(m); toast.error(m);
      }
    })}>
      {([["password", "New password", "At least 8 characters."], ["confirmPassword", "Confirm new password", ""]] as const).map(([name, label, hint]) => (
        <div key={name} className="space-y-1.5">
          <Label htmlFor={name}>{label}</Label>
          <Input id={name} type="password" autoComplete="new-password" aria-invalid={!!errors[name]} aria-describedby={`${name}-msg`} {...register(name)} />
          <p id={`${name}-msg`} className={errors[name] ? "text-xs text-danger" : "text-xs text-muted-foreground"}>{errors[name] ? errors[name]?.message : hint}</p>
        </div>
      ))}
      {serverError ? <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{serverError}</p> : null}
      <Button type="submit" className="w-full" loading={isSubmitting}>Reset password</Button>
    </form>
  );
}
