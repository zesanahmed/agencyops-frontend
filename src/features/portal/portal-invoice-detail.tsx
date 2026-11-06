"use client";

import Link from "next/link";
import { ArrowLeft, CreditCard, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { InvoiceStatusBadge } from "@/features/invoices/invoice-status-badge";
import { InvoiceTotals } from "@/features/invoices/invoice-totals";
import { ApiError } from "@/lib/api/errors";
import { formatCalendarDate, formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { usePortalInvoice, useStartInvoiceCheckout } from "./hooks";

export function PortalInvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const q = usePortalInvoice(invoiceId);
  const checkout = useStartInvoiceCheckout(invoiceId);

  if (q.isLoading) return <div className="space-y-4" role="status" aria-label="Loading invoice"><Skeleton className="h-10 w-64" /><Skeleton className="h-72" /></div>;
  if (q.isError || !q.data) {
    const notFound = q.error instanceof ApiError && (q.error.status === 404 || q.error.status === 403);
    return <ErrorState error={q.error} onRetry={() => q.refetch()} title={notFound ? "Invoice not found" : "Couldn't load this invoice"} />;
  }
  const inv = q.data;

  return (
    <>
      <Link href="/client/invoices" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden /> All invoices</Link>
      <PageHeader title={inv.number} actions={<InvoiceStatusBadge status={inv.status} />} />

      {inv.status === "PAID" ? <p className="mb-4 rounded-md border border-border bg-success-soft px-3 py-2 text-sm text-success">Paid {formatDateTime(inv.paidAt)}. Thank you.</p> : null}
      {inv.status === "VOID" ? <p className="mb-4 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-muted-foreground">This invoice was cancelled by your agency and can&apos;t be paid.</p> : null}

      <div className="space-y-6 rounded-lg border border-border bg-surface p-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-muted-foreground">Issued</dt><dd className="font-medium">{formatCalendarDate(inv.issueDate)}</dd></div>
          <div><dt className="text-muted-foreground">Due</dt><dd className="font-medium">{formatCalendarDate(inv.dueDate)}</dd></div>
          <div><dt className="text-muted-foreground">Amount</dt><dd className="font-medium tabular-nums">{formatMoney(inv.totalCents, inv.currency)}</dd></div>
        </dl>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <caption className="sr-only">Line items</caption>
            <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground"><th scope="col" className="py-2 pr-3 font-medium">Description</th><th scope="col" className="px-3 py-2 text-right font-medium">Qty</th><th scope="col" className="px-3 py-2 text-right font-medium">Unit price</th><th scope="col" className="py-2 pl-3 text-right font-medium">Amount</th></tr></thead>
            <tbody className="divide-y divide-border">
              {inv.items.map((i, idx) => <tr key={idx}><td className="py-2.5 pr-3">{i.description}</td><td className="px-3 py-2.5 text-right tabular-nums">{i.quantity}</td><td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(i.unitAmountCents, inv.currency)}</td><td className="py-2.5 pl-3 text-right tabular-nums">{formatMoney(i.amountCents, inv.currency)}</td></tr>)}
            </tbody>
          </table>
        </div>
        <InvoiceTotals currency={inv.currency} subtotalCents={inv.subtotalCents} discountCents={inv.discountCents} taxCents={inv.taxCents} totalCents={inv.totalCents} />
        {inv.notes ? <p className="whitespace-pre-wrap border-t border-border pt-4 text-sm text-muted-foreground"><span className="font-medium text-foreground">Notes: </span>{inv.notes}</p> : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {inv.status === "OPEN" ? (
          // The server decides what is charged; this only asks it to open a Checkout session for this invoice.
          <Button size="lg" loading={checkout.isPending} onClick={() => checkout.mutate(undefined, { onSuccess: (url) => window.location.assign(url) })}><CreditCard /> Pay {formatMoney(inv.totalCents, inv.currency)}</Button>
        ) : null}
        {inv.pdfUrl ? <Button variant="secondary" asChild><a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer"><Download /> Download PDF</a></Button> : null}
      </div>
      {inv.status === "OPEN" ? <p className="mt-3 text-xs text-muted-foreground">You&apos;ll pay on Stripe&apos;s secure page. This invoice shows as paid once the payment is confirmed. Test mode: card 4242 4242 4242 4242.</p> : null}
    </>
  );
}
