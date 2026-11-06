"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileDown, Pencil, Send, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { useClient } from "@/features/clients/hooks";
import { Can, useOrg } from "@/features/organizations/org-context";
import { useProject } from "@/features/projects/hooks";
import { ApiError } from "@/lib/api/errors";
import { formatCalendarDate, formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { useInvoice, useRequestInvoicePdf, useSendInvoice, useVoidInvoice } from "./hooks";
import { InvoiceStatusBadge, PaymentStatusBadge } from "./invoice-status-badge";
import { InvoiceTotals } from "./invoice-totals";

export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const { organizationId: o } = useOrg();
  const [pdfRequested, setPdfRequested] = useState(false);
  const [confirm, setConfirm] = useState<"send" | "void" | null>(null);
  const q = useInvoice(o, invoiceId, pdfRequested);
  const inv = q.data;
  const client = useClient(o, inv?.clientId ?? "");
  const project = useProject(o, inv?.projectId ?? "");
  const send = useSendInvoice(o, invoiceId);
  const voidIt = useVoidInvoice(o, invoiceId);
  const pdf = useRequestInvoicePdf(o, invoiceId);

  if (q.isLoading) return <div className="space-y-4" role="status" aria-label="Loading invoice"><Skeleton className="h-10 w-64" /><Skeleton className="h-72" /></div>;
  if (q.isError || !inv) {
    const notFound = q.error instanceof ApiError && q.error.status === 404;
    return <ErrorState error={q.error} onRetry={() => q.refetch()} title={notFound ? "Invoice not found" : "Couldn't load this invoice"} />;
  }
  const waitingForPdf = pdfRequested && !inv.pdfUrl;

  return (
    <>
      <Link href={`/organizations/${o}/invoices`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden /> All invoices</Link>
      <PageHeader title={inv.number} description={client.data ? `For ${client.data.name}` : undefined}
        actions={<>
          <InvoiceStatusBadge status={inv.status} />
          <Can permission="invoice:manage">
            {inv.status === "DRAFT" ? <Button variant="secondary" asChild><Link href={`/organizations/${o}/invoices/${inv.id}/edit`}><Pencil /> Edit</Link></Button> : null}
            {inv.status === "DRAFT" ? <Button onClick={() => setConfirm("send")} disabled={inv.totalCents <= 0} title={inv.totalCents <= 0 ? "An invoice needs a total above zero before it can be sent" : undefined}><Send /> Send to client</Button> : null}
            {inv.status === "DRAFT" || inv.status === "OPEN" ? <Button variant="ghost" onClick={() => setConfirm("void")}><Ban /> Void</Button> : null}
          </Can>
        </>} />

      {inv.status === "OPEN" ? <p className="mb-4 rounded-md border border-border bg-warning-soft px-3 py-2 text-sm text-warning">Sent {formatDateTime(inv.sentAt)}. The client sees it in the portal and pays by card from the portal; this page updates once the payment is confirmed by the payment provider.</p> : null}
      {inv.status === "PAID" ? <p className="mb-4 rounded-md border border-border bg-success-soft px-3 py-2 text-sm text-success">Paid {formatDateTime(inv.paidAt)}.</p> : null}
      {inv.status === "VOID" ? <p className="mb-4 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-muted-foreground">Voided {formatDateTime(inv.voidedAt)}. It can no longer be paid.</p> : null}

      <div className="space-y-6 rounded-lg border border-border bg-surface p-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-muted-foreground">Client</dt><dd className="font-medium">{client.data ? <Link href={`/organizations/${o}/clients/${client.data.id}`} className="hover:underline">{client.data.name}</Link> : "—"}</dd></div>
          <div><dt className="text-muted-foreground">Project</dt><dd className="font-medium">{inv.projectId ? (project.data ? <Link href={`/organizations/${o}/projects/${project.data.id}`} className="hover:underline">{project.data.name}</Link> : "…") : "None"}</dd></div>
          <div><dt className="text-muted-foreground">Issued</dt><dd className="font-medium">{formatCalendarDate(inv.issueDate)}</dd></div>
          <div><dt className="text-muted-foreground">Due</dt><dd className="font-medium">{formatCalendarDate(inv.dueDate)}</dd></div>
        </dl>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
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

      <section aria-labelledby="pdf-h" className="mt-6 flex flex-wrap items-center gap-3">
        <h2 id="pdf-h" className="sr-only">PDF</h2>
        {inv.pdfUrl ? <Button variant="secondary" asChild><a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer"><Download /> Download PDF</a></Button> : null}
        <Can permission="invoice:manage">
          <Button variant={inv.pdfUrl ? "ghost" : "secondary"} loading={pdf.isPending || waitingForPdf} onClick={() => pdf.mutate(undefined, { onSuccess: () => setPdfRequested(true) })}><FileDown /> {inv.pdfUrl ? "Regenerate PDF" : "Generate PDF"}</Button>
        </Can>
        {waitingForPdf ? <span role="status" className="text-sm text-muted-foreground">Rendering… the download appears here when it is ready.</span> : null}
        {inv.pdfGeneratedAt && inv.pdfUrl ? <span className="text-xs text-muted-foreground">Generated {formatDateTime(inv.pdfGeneratedAt)}</span> : null}
      </section>

      <section aria-labelledby="pay-h" className="mt-8 space-y-2">
        <h2 id="pay-h" className="text-sm font-semibold">Payments</h2>
        {!inv.payments.length ? <p className="text-sm text-muted-foreground">No payment attempts yet.</p> : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {inv.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="tabular-nums font-medium">{formatMoney(p.amountCents, p.currency)}</span>
                <PaymentStatusBadge status={p.status} />
                <span className="text-muted-foreground">{p.paidAt ? `Paid ${formatDateTime(p.paidAt)}` : `Started ${formatDateTime(p.createdAt)}`}</span>
                {p.failureReason ? <span className="text-danger">{p.failureReason}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog open={confirm === "send"} onOpenChange={(v) => !v && setConfirm(null)} confirmLabel="Send invoice" title={`Send ${inv.number}?`}
        description={`It becomes visible to the client's contacts in the portal, where they can pay ${formatMoney(inv.totalCents, inv.currency)} by card. No e-mail is sent, so let them know. A sent invoice can no longer be edited.`} onConfirm={() => send.mutateAsync(undefined)} />
      <ConfirmDialog open={confirm === "void"} onOpenChange={(v) => !v && setConfirm(null)} destructive confirmLabel="Void invoice" title={`Void ${inv.number}?`}
        description="The invoice can no longer be paid. If the client already started a payment, the money must be reviewed in Stripe. This can't be undone." onConfirm={() => voidIt.mutateAsync(undefined)} />
    </>
  );
}
