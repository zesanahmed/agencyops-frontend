"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MailCheck, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { RoleBadge } from "@/components/shared/role-badge";
import { useAuth } from "@/features/auth/auth-provider";
import { qk } from "@/lib/query-keys";
import { formatDate } from "@/lib/format";
import { invitationApi } from "@/lib/api/services";
import { useAction } from "@/lib/use-action";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Public preview → accept. Backend contract: GET /invitations/:token returns
 * { invitation: { organizationName, email, role, expiresAt } } for a pending,
 * unexpired invitation (anything else is a 4xx), and accept requires the signed-in
 * account's email to match the invitation's email.
 */
export function InviteView({ token }: { token: string }) {
  const { status } = useAuth();
  const me = useAuthStore((s) => s.user);
  const router = useRouter();
  const qc = useQueryClient();
  const preview = useQuery({ queryKey: ["invitation", token], queryFn: () => invitationApi.preview(token), retry: false });
  const accept = useAction({ fn: () => invitationApi.accept(token), success: "You've joined the organization" });

  if (preview.isLoading) return <Skeleton className="h-48" />;
  if (preview.isError)
    return <ErrorState error={preview.error} title="This invitation isn't valid" />;

  const inv = preview.data!;
  const next = `/invite/${token}`;
  const emailMismatch = status === "authenticated" && me && inv.email && me.email.toLowerCase() !== inv.email.toLowerCase();

  return (
    <div className="space-y-6 rounded-lg border border-border bg-surface p-6">
      <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary"><MailCheck className="size-5" aria-hidden /></span>
        <div><h1 className="text-lg font-semibold tracking-tight">You&apos;re invited to {inv.organizationName}</h1><p className="text-sm text-muted-foreground">Invitation for {inv.email} · expires {formatDate(inv.expiresAt)}</p></div></div>
      <p className="flex items-center gap-2 text-sm">You&apos;ll join as <RoleBadge role={inv.role} /></p>
      {status === "authenticated" ? (
        emailMismatch ? (
          <div role="alert" className="space-y-2 rounded-md bg-warning-soft p-3 text-sm">
            <p className="flex items-center gap-2 font-medium"><MailX className="size-4" aria-hidden /> Wrong account</p>
            <p>You&apos;re signed in as {me?.email}, but this invitation is for {inv.email}. Sign out and sign in with the invited address to accept it.</p>
          </div>
        ) : (
          <Button className="w-full" loading={accept.isPending} onClick={async () => {
            const r = await accept.mutateAsync(undefined).then(() => true, () => false);
            if (r) { await qc.invalidateQueries({ queryKey: qk.orgs }); router.replace("/organizations"); }
          }}>Accept invitation</Button>
        )
      ) : status === "anonymous" ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Sign in or create an account with <strong className="font-medium text-foreground">{inv.email}</strong> to accept — the account email must match the invitation.</p>
          <div className="flex gap-2"><Button asChild className="flex-1"><Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></Button><Button asChild variant="secondary" className="flex-1"><Link href={`/register?next=${encodeURIComponent(next)}`}>Create account</Link></Button></div>
        </div>
      ) : <Skeleton className="h-9" />}
    </div>
  );
}
