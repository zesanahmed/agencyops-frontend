"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { RoleBadge } from "@/components/shared/role-badge";
import { useAuth } from "@/features/auth/auth-provider";
import { qk, useOrganization } from "@/features/organizations/hooks";
import { organizationSchema, type OrganizationValues } from "@/features/organizations/schemas";
import { mergePreferences } from "./preferences";
import { useOrg } from "@/features/organizations/org-context";
import { notificationApi, orgApi } from "@/lib/api/services";
import { useAction } from "@/lib/use-action";

export function SettingsView() {
  return (
    <div className="max-w-2xl space-y-10">
      <OrganizationSection />
      <PreferencesSection />
      <SessionSection />
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-border pt-6 first:border-0 first:pt-0">
      <div><h2 className="text-base font-semibold">{title}</h2>{description ? <p className="text-sm text-muted-foreground">{description}</p> : null}</div>
      {children}
    </section>
  );
}

function OrganizationSection() {
  const { organizationId: o, role, roleLoading, can } = useOrg();
  const router = useRouter();
  const org = useOrganization(o);
  const update = useAction({ fn: (name: string) => orgApi.update(o, { name }), invalidate: [qk.orgs, qk.org(o)], success: "Organization renamed" });
  const del = useAction({ fn: () => orgApi.remove(o), invalidate: [qk.orgs], deferRefetch: true, success: "Organization deleted" });
  const [confirming, setConfirming] = useState(false);
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<OrganizationValues>({ resolver: zodResolver(organizationSchema), values: { name: org.data?.name ?? "" } });

  if (org.isLoading) return <Skeleton className="h-32" />;
  if (org.isError) return <ErrorState error={org.error} onRetry={() => org.refetch()} title="Couldn't load the organization" />;
  const editable = can("organization:update");

  return (
    <Section title="Organization" description="Your role here decides what you can change.">
      <div className="flex items-center gap-2 text-sm">Your role: {roleLoading ? <Skeleton className="h-5 w-20" /> : role ? <RoleBadge role={role} /> : <span className="text-muted-foreground">unknown</span>}</div>
      <form noValidate className="flex items-start gap-2" onSubmit={handleSubmit((v) => update.mutate(v.name))}>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="org-rename">Name</Label>
          <Input id="org-rename" disabled={!editable || roleLoading} aria-invalid={!!errors.name} {...register("name")} />
          {errors.name ? <p className="text-xs text-danger">{errors.name.message}</p> : !roleLoading && !editable ? <p className="text-xs text-muted-foreground">Only owners can rename the organization.</p> : null}
        </div>
        {editable ? <Button type="submit" className="mt-6" loading={update.isPending} disabled={!isDirty}>Save</Button> : null}
      </form>
      {can("organization:delete") ? (
        <div className="rounded-lg border border-danger/30 p-4">
          <h3 className="text-sm font-semibold text-danger">Delete organization</h3>
          <p className="mt-1 text-sm text-muted-foreground">Removes the organization and everything in it for all members.</p>
          <Button variant="danger" size="sm" className="mt-3" onClick={() => setConfirming(true)}>Delete organization</Button>
        </div>
      ) : null}
      <ConfirmDialog open={confirming} onOpenChange={setConfirming} title="Delete this organization?" description={`“${org.data?.name}” and all its projects, tasks and memberships will be removed.`} confirmLabel="Delete organization" destructive
        onConfirm={async () => { await del.mutateAsync(undefined); router.replace("/organizations"); }} />
    </Section>
  );
}

const PREF_LABEL: Record<string, string> = { MENTION: "Mentions" };
const prefLabel = (t: string) => PREF_LABEL[t] ?? t.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function PreferencesSection() {
  const { organizationId: o } = useOrg();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: qk.prefs(o), queryFn: () => notificationApi.preferences(o) });
  const toggle = useAction({
    fn: (v: { notificationType: string; channel: "emailEnabled" | "inAppEnabled"; value: boolean }) => notificationApi.updatePreference(o, v.notificationType, { [v.channel]: v.value }),
    invalidate: [qk.prefs(o)],
    success: "Preference saved",
  });

  return (
    <Section title="Notification preferences" description="Choose how each kind of event should reach you in this organization. New types start enabled.">
      {isLoading ? <Skeleton className="h-24" /> : isError ? <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load preferences" />
        : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {mergePreferences(data ?? []).map((p) => (
              <li key={p.notificationType} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm font-medium">{prefLabel(p.notificationType)}</span>
                <div className="flex items-center gap-5">
                  {([["inAppEnabled", "In-app"], ["emailEnabled", "Email"]] as const).map(([channel, label]) => (
                    <label key={channel} htmlFor={`pref-${p.notificationType}-${channel}`} className="flex items-center gap-2 text-sm">
                      <input id={`pref-${p.notificationType}-${channel}`} type="checkbox" role="switch" className="size-4 accent-(--primary)" checked={p[channel]} disabled={toggle.isPending}
                        onChange={(e) => toggle.mutate({ notificationType: p.notificationType, channel, value: e.target.checked })} />
                      {label}
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      <p className="text-xs text-muted-foreground">Your choices are saved to your account. The backend doesn&apos;t apply them to in-app notifications yet, and email delivery isn&apos;t live, so for now they&apos;re stored for when it does.</p>
    </Section>
  );
}

function SessionSection() {
  const { logoutAll } = useAuth();
  const [confirming, setConfirming] = useState(false);
  return (
    <Section title="Sessions" description="Sign out of every device, including this one.">
      <Button variant="secondary" onClick={() => setConfirming(true)}>Sign out everywhere</Button>
      <ConfirmDialog open={confirming} onOpenChange={setConfirming} title="Sign out of all sessions?" description="You'll need to sign in again on every device." confirmLabel="Sign out everywhere" destructive
        onConfirm={() => logoutAll().catch(() => toast.error("Signed out locally; the server could not be reached."))} />
    </Section>
  );
}
