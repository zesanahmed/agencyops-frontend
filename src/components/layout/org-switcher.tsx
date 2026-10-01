"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization, useOrganizations } from "@/features/organizations/hooks";
import { cn } from "@/lib/utils";

export function OrgSwitcher({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const orgs = useOrganizations();
  const current = useOrganization(organizationId);
  const name = current.data?.name ?? orgs.data?.items.find((o) => o.id === organizationId)?.name;

  if (!name) return <Skeleton className="h-9 w-full" />;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2 text-left text-sm hover:bg-surface-muted" aria-label={`Organization: ${name}. Switch organization`}>
        <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-primary-soft text-xs font-semibold text-primary">{name[0]?.toUpperCase()}</span>
        <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
        <ChevronsUpDown className="size-4 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        {orgs.data?.items.map((o) => (
          <DropdownMenuItem key={o.id} onSelect={() => router.push(`/organizations/${o.id}`)}>
            <span className={cn("flex-1 truncate", o.id === organizationId && "font-medium")}>{o.name}</span>
            {o.id === organizationId ? <Check className="text-primary" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/organizations"><Plus /> All organizations</Link></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
