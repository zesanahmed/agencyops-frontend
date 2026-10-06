"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Crown, Shield, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toErrorMessage } from "@/lib/api/errors";
import { safeNext } from "@/lib/auth/safe-next";
import { cn } from "@/lib/utils";
import { useAuth } from "./auth-provider";
import { DEMO_ACCOUNTS, isDemoConfigured, type DemoAccount } from "./demo-accounts";
import { loginSchema, type LoginValues } from "./schemas";

const ROLE_ICON = { OWNER: Crown, MANAGER: Shield, TEAM_MEMBER: User } as const;

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [serverError, setServerError] = useState<string | null>(null);
  const [demoPending, setDemoPending] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function doLogin(values: LoginValues) {
    setServerError(null);
    try {
      await login(values);
      router.replace(next);
    } catch (e) {
      const msg = toErrorMessage(e);
      setServerError(msg);
      toast.error(msg);
      throw e;
    }
  }

  async function demoLogin(account: DemoAccount) {
    if (!account.email || !account.password) return;
    setDemoPending(account.role);
    try { await doLogin({ email: account.email, password: account.password }); } catch { /* surfaced above */ } finally { setDemoPending(null); }
  }

  const busy = isSubmitting || demoPending !== null;

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit((v) => doLogin(v).catch(() => undefined))} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />
          {errors.email ? <p id="email-error" className="text-xs text-danger">{errors.email.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} {...register("password")} />
          {errors.password ? <p id="password-error" className="text-xs text-danger">{errors.password.message}</p> : null}
        </div>
        {serverError ? <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{serverError}</p> : null}
        <Button type="submit" className="w-full" loading={isSubmitting} disabled={busy}>Sign in</Button>
        <p className="text-center text-sm text-muted-foreground">
          New to AgencyOps? <Link href="/register" className="font-medium text-primary hover:underline">Create an account</Link>
        </p>
      </form>

      <section aria-labelledby="demo-heading" className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <h2 id="demo-heading" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Quick demo login</h2>
          <span className="h-px flex-1 bg-border" />
        </div>
        <ul className="grid gap-2 sm:grid-cols-3">
          {DEMO_ACCOUNTS.map((a) => {
            const Icon = ROLE_ICON[a.role];
            const ready = isDemoConfigured(a);
            return (
              <li key={a.role} className={cn("flex flex-col justify-between gap-3 rounded-lg border border-border bg-surface p-3", !ready && "opacity-70")}>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium"><Icon className="size-4 text-primary" aria-hidden />{a.label}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{a.blurb}</p>
                </div>
                <Button variant="secondary" size="sm" disabled={!ready || busy} loading={demoPending === a.role} onClick={() => demoLogin(a)}
                  title={ready ? undefined : "Demo accounts aren't configured yet"}>
                  Demo login
                </Button>
              </li>
            );
          })}
        </ul>
        {DEMO_ACCOUNTS.some((a) => !isDemoConfigured(a)) ? (
          <p className="text-xs text-muted-foreground">Demo accounts activate once the backend seeds them and their credentials are set in the environment.</p>
        ) : null}
      </section>
    </div>
  );
}
