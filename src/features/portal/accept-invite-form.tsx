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
import { ApiError, toErrorMessage } from "@/lib/api/errors";
import { extractFieldErrors } from "@/lib/api/field-errors";
import { usePortalAuth } from "./portal-auth-provider";
import { acceptInviteSchema, type AcceptInviteValues } from "./schemas";

/** The invitation link (/portal/accept-invite?token=…) sets the contact's password and signs them in. The token works once. */
export function AcceptInviteForm() {
  const token = useSearchParams().get("token")?.trim() ?? "";
  const { acceptInvite } = usePortalAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<AcceptInviteValues>({ resolver: zodResolver(acceptInviteSchema) });

  if (!token || linkInvalid)
    return (
      <div className="space-y-3" role="alert">
        <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{token ? "This invitation link is invalid, has expired, or was already used." : "This page needs the link from your invitation e-mail."}</p>
        <p className="text-sm text-muted-foreground">Ask your agency to send a new invitation. If you already set a password, <Link href="/client/login" className="font-medium text-primary hover:underline">sign in here</Link>.</p>
      </div>
    );

  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit(async ({ password }) => {
      setServerError(null);
      try {
        const c = await acceptInvite({ token, password });
        toast.success(`Welcome, ${c.name}`);
        router.replace("/client");
      } catch (e) {
        const fields = extractFieldErrors(e, ["password", "token"] as const);
        if (fields.password) { setError("password", { type: "server", message: fields.password }); return; }
        if (fields.token || (e instanceof ApiError && (e.status === 400 || e.status === 404))) { setLinkInvalid(true); return; }
        const m = toErrorMessage(e); setServerError(m); toast.error(m);
      }
    })}>
      {([["password", "Choose a password", "8–72 characters."], ["confirmPassword", "Confirm password", ""]] as const).map(([name, label, hint]) => (
        <div key={name} className="space-y-1.5">
          <Label htmlFor={`inv-${name}`}>{label}</Label>
          <Input id={`inv-${name}`} type="password" autoComplete="new-password" aria-invalid={!!errors[name]} aria-describedby={`inv-${name}-msg`} {...register(name)} />
          <p id={`inv-${name}-msg`} className={errors[name] ? "text-xs text-danger" : "text-xs text-muted-foreground"}>{errors[name] ? errors[name]?.message : hint}</p>
        </div>
      ))}
      {serverError ? <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{serverError}</p> : null}
      <Button type="submit" className="w-full" loading={isSubmitting}>Set password and continue</Button>
    </form>
  );
}
