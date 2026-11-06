"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Pagination } from "@/components/shared/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceStatusBadge } from "@/features/invoices/invoice-status-badge";
import { useUrlState } from "@/hooks/use-url-state";
import { formatCalendarDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { usePortalInvoices } from "./hooks";

const PAGE_SIZE = 15;

/** Invoices the agency has sent this client (drafts are never visible). */
export function PortalInvoicesView() {
  const { page } = useUrlState();
  const q = usePortalInvoices({ page, limit: PAGE_SIZE });
  if (q.isLoading) return <div className="space-y-2" role="status" aria-label="Loading invoices">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load your invoices" />;
  if (!q.data?.items.length) return <EmptyState icon={FileText} title="No invoices yet" description="When your agency sends you an invoice, it appears here and you can pay it by card." />;
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {q.data.items.map((i) => (
          <li key={i.id}>
            <Link href={`/client/invoices/${i.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-surface-muted">
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{i.number}</span><span className="block text-xs text-muted-foreground">Due {formatCalendarDate(i.dueDate)}</span></span>
              <span className="text-sm tabular-nums">{formatMoney(i.totalCents, i.currency)}</span>
              <InvoiceStatusBadge status={i.status} />
            </Link>
          </li>
        ))}
      </ul>
      <Pagination meta={q.data.meta} />
    </div>
  );
}
