"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BadgeCheck, MailWarning } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { useOrganizations } from "@/features/organizations/hooks";
import { authApi } from "@/lib/api/services";
import { toErrorMessage } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import { useAuth } from "./auth-provider";
import { ChangePasswordForm } from "./change-password-form";
import { DeleteAccountDialog } from "./delete-account-dialog";
import { SessionsPanel } from "./sessions-panel";

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div className="space-y-0.5"><h2 id={id} className="text-sm font-semibold">{title}</h2>{description ? <p className="text-sm text-muted-foreground">{description}</p> : null}</div>
      {children}
    </section>
  );
}

export function ProfileView() {
  const { user, logout, logoutAll, refreshUser } = useAuth();
  const orgs = useOrganizations();
  const [deleting, setDeleting] = useState(false);
  const [resending, setResending] = useState(false);
  const verified = user?.emailVerifiedAt;

  async function resend() {
    setResending(true);
    try {
      if (await authApi.resendVerification()) toast.success("Verification e-mail sent. Check your inbox.");
      else { toast.info("Your address is already verified."); await refreshUser(); }
    } catch (e) { toast.error(toErrorMessage(e)); } finally { setResending(false); }
  }

  return (
    <>
      <PageHeader title="Profile" description="Your account across all organizations." />
      <div className="space-y-10">
        <div className="space-y-3">
          <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
            <Avatar name={user?.name || user?.email || "?"} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{user?.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
            </div>
            {verified ? <Badge tone="success" title={`Verified ${formatDate(verified)}`}><BadgeCheck className="size-3" aria-hidden />Verified</Badge>
              : verified === null ? <Badge tone="warning"><MailWarning className="size-3" aria-hidden />Not verified</Badge> : null}
          </div>
          {verified === null ? (
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              We sent a verification link to your address when you signed up.
              <Button variant="link" size="sm" loading={resending} onClick={resend}>Resend e-mail</Button>
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">Name and e-mail can&apos;t be edited: the backend has no account-update endpoint.</p>
        </div>

        <Section id="mem-h" title="Your memberships">
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {orgs.data?.items.map((o) => <li key={o.id}><Link href={`/organizations/${o.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-muted"><span className="truncate text-sm">{o.name}</span></Link></li>)}
            {!orgs.data?.items.length ? <li className="px-4 py-3 text-sm text-muted-foreground">{orgs.isLoading ? "Loading…" : "No organizations yet."}</li> : null}
          </ul>
        </Section>

        <Section id="pw-h" title="Password" description="Choose a new password. Every device is signed out afterwards."><ChangePasswordForm /></Section>

        <Section id="ses-h" title="Where you're signed in" description="Sign out any device you don't recognize.">
          <SessionsPanel />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => logout().catch(() => toast.error("Signed out locally; the server could not be reached."))}>Sign out</Button>
            <Button variant="ghost" onClick={() => logoutAll().catch(() => toast.error("Signed out locally; the server could not be reached."))}>Sign out everywhere</Button>
          </div>
        </Section>

        <Section id="danger-h" title="Delete account" description="Permanently removes your account. If you still own an organization, delete it or hand it over first.">
          <div><Button variant="danger" onClick={() => setDeleting(true)}>Delete account…</Button></div>
        </Section>
      </div>
      <DeleteAccountDialog open={deleting} onOpenChange={setDeleting} />
    </>
  );
}
