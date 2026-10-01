"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { ApiError } from "@/lib/api/errors";
import { useOrganization } from "@/features/organizations/hooks";

/**
 * Resolves the organization before rendering its pages. A 403/404 means the
 * caller isn't a member (the backend deliberately doesn't reveal whether the
 * org exists), so we show one neutral state instead of a half-loaded shell.
 */
export function OrgGuard({ organizationId, children }: { organizationId: string; children: React.ReactNode }) {
  const org = useOrganization(organizationId);
  if (org.isLoading) return <div className="space-y-4" role="status" aria-label="Loading organization"><Skeleton className="h-8 w-64" /><Skeleton className="h-48" /></div>;
  if (org.isError) {
    const e = org.error;
    if (e instanceof ApiError && (e.isNotFound || e.isForbidden))
      return <EmptyState icon={Building2} title="Organization unavailable" description="It doesn't exist, or you're not a member. Ask an owner for an invitation."
        action={<Button asChild><Link href="/organizations">Your organizations</Link></Button>} />;
    return <ErrorState error={e} onRetry={() => org.refetch()} title="Couldn't load this organization" />;
  }
  return <>{children}</>;
}
