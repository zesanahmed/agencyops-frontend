"use client";

import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrgStore } from "@/stores/org-store";
import { useOrganizations } from "./hooks";
import { CreateOrganizationDialog } from "./create-organization-dialog";

export function OrganizationList() {
  const { data, isLoading, isError, error, refetch } = useOrganizations();
  const lastId = useOrgStore((s) => s.lastOrganizationId);

  if (isLoading) return <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load your organizations" />;
  if (!data?.items.length)
    return (
      <EmptyState icon={Building2} title="No organizations yet"
        description="Create your agency's workspace, or ask an owner to invite you — invitations arrive as a link."
        action={<CreateOrganizationDialog />} />
    );

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {[...data.items].sort((a, b) => Number(b.id === lastId) - Number(a.id === lastId)).map((o) => (
        <li key={o.id}>
          <Link href={`/organizations/${o.id}`} className="group flex h-full items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-sm font-semibold text-primary">{o.name[0]?.toUpperCase()}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{o.name}</span>
              {o.id === lastId ? <span className="mt-1 inline-block"><Badge tone="primary">Last used</Badge></span> : null}
            </span>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
