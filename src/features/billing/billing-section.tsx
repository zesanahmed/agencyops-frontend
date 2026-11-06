"use client";

import { CreditCard, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useOrg } from "@/features/organizations/org-context";
import { formatDate } from "@/lib/format";
import { useBilling, useOpenBillingPortal, useStartCheckout } from "./hooks";

const STATUS_LABEL: Record<string, string> = { active: "Active", trialing: "Trial", past_due: "Payment past due", canceled: "Canceled", unpaid: "Unpaid", incomplete: "Incomplete" };

/** Plan + subscription for the organization. Managing it (Stripe Checkout / customer portal) is OWNER-only on the server. */
export function BillingSection() {
  const { organizationId: o, can } = useOrg();
  const q = useBilling(o);
  const checkout = useStartCheckout(o);
  const portal = useOpenBillingPortal(o);
  const go = (url: string) => { window.location.assign(url); };

  if (q.isLoading) return <Skeleton className="h-28" />;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load billing" />;
  const { plan, subscription } = q.data;
  const pro = plan.code === "PRO";
  const manage = can("billing:manage");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-4">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary-soft text-primary"><Sparkles className="size-4" aria-hidden /></span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-medium">{plan.name} plan {subscription.status ? <Badge tone={subscription.status === "active" || subscription.status === "trialing" ? "success" : "warning"}>{STATUS_LABEL[subscription.status] ?? subscription.status}</Badge> : null}</p>
          <p className="text-sm text-muted-foreground">
            {pro && subscription.currentPeriodEnd
              ? subscription.cancelAtPeriodEnd ? `Cancels on ${formatDate(subscription.currentPeriodEnd)}. You keep Pro until then.` : `Renews on ${formatDate(subscription.currentPeriodEnd)}.`
              : pro ? "Unlimited members and projects." : "Upgrade to Pro for unlimited members and projects."}
          </p>
        </div>
        {manage ? (pro ? (
          subscription.hasBillingAccount ? <Button variant="secondary" loading={portal.isPending} onClick={() => portal.mutate(undefined, { onSuccess: go })}><CreditCard /> Manage billing</Button> : null
        ) : <Button loading={checkout.isPending} onClick={() => checkout.mutate(undefined, { onSuccess: go })}>Upgrade to Pro</Button>) : null}
      </div>
      {!manage ? <p className="text-xs text-muted-foreground">Only the organization owner can change the plan.</p> : null}
      <p className="text-xs text-muted-foreground">Payments are processed by Stripe in test mode. Use card 4242 4242 4242 4242 with any future date and CVC.</p>
    </div>
  );
}
