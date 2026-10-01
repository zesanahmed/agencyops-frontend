"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { RoleBadge } from "@/components/shared/role-badge";
import { useAuth } from "@/features/auth/auth-provider";
import { qk } from "@/features/organizations/hooks";
import { asRole } from "@/lib/api/mappers";
import { invitationApi } from "@/lib/api/services";
import { useAction } from "@/lib/use-action";

type R = Record<string, unknown>;
const rec = (v: unknown): R => (typeof v === "object" && v !== null ? (v as R) : {});

export function InviteView({ token }: { token: string }) {
  const { status } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const preview = useQuery({ queryKey: ["invitation", token], queryFn: () => invitationApi.preview(token), retry: false });
  const accept = useAction({ fn: () => invitationApi.accept(token), success: "You've joined the organization" });

  if (preview.isLoading) return <Skeleton className="h-48" />;
  if (preview.isError) return <ErrorState error={preview.error} title="This invitation isn't valid" />;

  const d = rec(preview.data);
  const orgName = (typeof rec(d.organization).name === "string" ? (rec(d.organization).name as string) : undefined) ?? (typeof d.organizationName === "string" ? d.organizationName : undefined);
  const role = asRole(d.role);
  const email = typeof d.email === "string" ? d.email : undefined;
  const next = `/invite/${token}`;

  return (
    <div className="space-y-6 rounded-lg border border-border bg-surface p-6">
      <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary"><MailCheck className="size-5" aria-hidden /></span>
        <div><h1 className="text-lg font-semibold tracking-tight">You&apos;re invited{orgName ? ` to ${orgName}` : ""}</h1>{email ? <p className="text-sm text-muted-foreground">Invitation for {email}</p> : null}</div></div>
      {role ? <p className="flex items-center gap-2 text-sm">You&apos;ll join as <RoleBadge role={role} /></p> : null}
      {status === "authenticated" ? (
        <Button className="w-full" loading={accept.isPending} onClick={async () => {
          const r = await accept.mutateAsync(undefined).catch(() => null);
          if (r !== null) { await qc.invalidateQueries({ queryKey: qk.orgs }); router.replace("/organizations"); }
        }}>Accept invitation</Button>
      ) : status === "anonymous" ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Sign in with the invited email address to accept. Accepting requires the account email to match the invitation.</p>
          <div className="flex gap-2"><Button asChild className="flex-1"><Link href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></Button><Button asChild variant="secondary" className="flex-1"><Link href="/register">Create account</Link></Button></div>
        </div>
      ) : <Skeleton className="h-9" />}
    </div>
  );
}
