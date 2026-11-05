"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_CLIENT } from "@/features/auth/demo-accounts";
import { toErrorMessage } from "@/lib/api/errors";
import { safeNext } from "@/lib/auth/safe-next";
import { usePortalAuth } from "./portal-auth-provider";
import { portalLoginSchema, type PortalLoginValues } from "./schemas";

export function PortalLoginForm() {
  const { login } = usePortalAuth();
  const router = useRouter();
  const params = useSearchParams();
  // Only portal pages are valid return targets; anything else falls back to the overview.
  const requested = safeNext(params.get("next"), "/client");
  const next = requested === "/client" || requested.startsWith("/client/") ? requested : "/client";
  const [serverError, setServerError] = useState<string | null>(null);
  const [demoPending, setDemoPending] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PortalLoginValues>({ resolver: zodResolver(portalLoginSchema), defaultValues: { organizationSlug: params.get("org") ?? "", email: "", password: "" } });

  async function doLogin(v: PortalLoginValues) {
    setServerError(null);
    try { await login(v); router.replace(next); } catch (e) { const m = toErrorMessage(e); setServerError(m); toast.error(m); throw e; }
  }
  const busy = isSubmitting || demoPending;

  return (
    <div className="space-y-6">
      <form noValidate className="space-y-4" onSubmit={handleSubmit((v) => doLogin(v).catch(() => undefined))}>
        <div className="space-y-1.5">
          <Label htmlFor="org">Agency</Label>
          <Input id="org" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="brightline-studio" aria-invalid={!!errors.organizationSlug} aria-describedby="org-hint" {...register("organizationSlug")} />
          <p id="org-hint" className={errors.organizationSlug ? "text-xs text-danger" : "text-xs text-muted-foreground"}>{errors.organizationSlug ? errors.organizationSlug.message : "Your agency's portal name, as in your invitation. Ask them if you're unsure."}</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="portal-email">Email</Label>
          <Input id="portal-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
          {errors.email ? <p className="text-xs text-danger">{errors.email.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="portal-password">Password</Label>
          <Input id="portal-password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register("password")} />
          {errors.password ? <p className="text-xs text-danger">{errors.password.message}</p> : null}
        </div>
        {serverError ? <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{serverError}</p> : null}
        <Button type="submit" className="w-full" loading={isSubmitting} disabled={busy}>Sign in</Button>
      </form>

      <div className="space-y-2 border-t border-border pt-5">
        <p className="text-center text-xs uppercase tracking-wider text-muted-foreground">Quick demo</p>
        <Button type="button" variant="secondary" className="w-full" loading={demoPending} disabled={busy}
          onClick={async () => { setDemoPending(true); try { await doLogin(DEMO_CLIENT); } catch { /* surfaced above */ } finally { setDemoPending(false); } }}>
          Demo client login
        </Button>
        <p className="text-center text-xs text-muted-foreground">Signs in as a sample client contact of the demo agency.</p>
      </div>
    </div>
  );
}
