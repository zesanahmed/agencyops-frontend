"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrg } from "@/features/organizations/org-context";
import { invoiceApi } from "@/lib/api/services";
import { formatMoney } from "@/lib/money";
import { qk } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { summarizeInvoices } from "./invoice-summary";

const InvoiceSummaryChart = dynamic(() => import("./invoice-summary-chart").then((m) => m.InvoiceSummaryChart), { ssr: false, loading: () => <Skeleton className="h-56" /> });
const LIMIT = 100;

/** Owner/manager view of the money side. Renders nothing for people without invoice access, or before any invoice exists. */
export function BillingGlance() {
  const { organizationId: o, can } = useOrg();
  const authed = useAuthStore((s) => s.status === "authenticated");
  const allowed = can("invoice:read");
  const q = useQuery({ queryKey: qk.invoices(o, { limit: LIMIT, glance: true }), queryFn: () => invoiceApi.list(o, { limit: LIMIT }), enabled: authed && allowed });
  if (!allowed) return null;
  if (q.isLoading) return <Skeleton className="h-72" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load billing figures" />;
  const summary = summarizeInvoices(q.data?.items ?? []);
  if (!summary) return null;
  const truncated = (q.data?.meta.total ?? 0) > LIMIT;

  return (
    <section aria-labelledby="bill-h" className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 id="bill-h" className="text-sm font-semibold">Billing at a glance</h2>
        <Link href={`/organizations/${o}/invoices`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">All invoices <ArrowRight className="size-3" aria-hidden /></Link>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {formatMoney(summary.awaitingCents, summary.currency)} awaiting payment across {summary.counts.awaiting} {summary.counts.awaiting === 1 ? "invoice" : "invoices"}; {formatMoney(summary.paidCents, summary.currency)} collected.
        {summary.mixedCurrencies ? ` Showing ${summary.currency.toUpperCase()} only: your invoices use more than one currency.` : ""}
        {truncated ? ` Based on your ${LIMIT} most recent invoices.` : ""}
      </p>
      <InvoiceSummaryChart summary={summary} />
    </section>
  );
}
