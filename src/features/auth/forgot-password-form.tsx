"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/services";
import { toErrorMessage } from "@/lib/api/errors";
import { forgotPasswordSchema, type ForgotPasswordValues } from "./schemas";

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  if (sentTo)
    return (
      <div className="space-y-4" role="status">
        <span className="flex size-10 items-center justify-center rounded-full bg-success-soft text-success"><MailCheck className="size-5" aria-hidden /></span>
        {/* The backend answers identically for known and unknown addresses, so this must not promise an account exists. */}
        <p className="text-sm">If an account exists for <strong className="font-medium">{sentTo}</strong>, a password reset link is on its way. It can take a minute to arrive.</p>
        <p className="text-sm text-muted-foreground">Nothing yet? Check spam, or <button type="button" className="font-medium text-primary hover:underline" onClick={() => setSentTo(null)}>try another address</button>.</p>
        <Link href="/login" className="text-sm font-medium text-primary hover:underline">Back to sign in</Link>
      </div>
    );

  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit(async ({ email }) => {
      setServerError(null);
      try { await authApi.forgotPassword(email); setSentTo(email); } catch (e) { const m = toErrorMessage(e); setServerError(m); toast.error(m); }
    })}>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />
        {errors.email ? <p id="email-error" className="text-xs text-danger">{errors.email.message}</p> : null}
      </div>
      {serverError ? <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{serverError}</p> : null}
      <Button type="submit" className="w-full" loading={isSubmitting}>Send reset link</Button>
      <p className="text-center text-sm text-muted-foreground">Remembered it? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link></p>
    </form>
  );
}
