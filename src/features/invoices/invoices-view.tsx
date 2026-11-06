"use client";

import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FilterSelect } from "@/components/shared/filter-select";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useClients } from "@/features/clients/hooks";
import { Can, useOrg } from "@/features/organizations/org-context";
import { useUrlState } from "@/hooks/use-url-state";
import { formatCalendarDate } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { INVOICE_STATUSES } from "@/types/domain";
import { useInvoices } from "./hooks";
import { InvoiceStatusBadge, invoiceStatusLabel } from "./invoice-status-badge";

const PAGE_SIZE = 15;

/** All invoices. Status, client and page live in the URL (?status=&clientId=&page=). */
export function InvoicesView() {
  const { organizationId: o } = useOrg();
  const { get, page, set } = useUrlState();
  const rawStatus = get("status");
  const status = (INVOICE_STATUSES as readonly string[]).includes(rawStatus) ? rawStatus : "";
  const clientId = get("clientId");
  const clients = useClients(o, { limit: 100, sortBy: "name", sortOrder: "asc" });
  const nameOf = new Map((clients.data?.items ?? []).map((c) => [c.id, c.name]));
  const q = useInvoices(o, { page, limit: PAGE_SIZE, ...(status ? { status } : {}), ...(clientId ? { clientId } : {}) });
  const filtered = Boolean(status || clientId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <FilterSelect param="status" label="Filter by status" allLabel="All statuses" options={INVOICE_STATUSES.map((s) => ({ value: s, label: invoiceStatusLabel(s) }))} />
        <FilterSelect param="clientId" label="Filter by client" allLabel="All clients" options={(clients.data?.items ?? []).map((c) => ({ value: c.id, label: c.name }))} />
        {filtered ? <Button variant="ghost" size="sm" onClick={() => set({ status: "", clientId: "" })}>Clear filters</Button> : null}
        <div className="sm:ml-auto"><Can permission="invoice:manage"><Button asChild><Link href={`/organizations/${o}/invoices/new`}><Plus /> New invoice</Link></Button></Can></div>
      </div>

      {q.isLoading ? <div className="space-y-2" role="status" aria-label="Loading invoices">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load invoices" />
        : !q.data?.items.length ? (
          <EmptyState icon={FileText} title={filtered ? "No invoices match these filters" : "No invoices yet"}
            description={filtered ? "Try a different status or client." : "Create an invoice for a client, send it, and they can pay it by card from the client portal."}
            action={filtered ? <Button variant="secondary" onClick={() => set({ status: "", clientId: "" })}>Clear filters</Button> : <Can permission="invoice:manage"><Button asChild><Link href={`/organizations/${o}/invoices/new`}><Plus /> Create an invoice</Link></Button></Can>} />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full min-w-[40rem] text-sm">
                <caption className="sr-only">Invoices</caption>
                <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-4 py-2.5 font-medium">Invoice</th><th scope="col" className="px-4 py-2.5 font-medium">Client</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Due</th><th scope="col" className="px-4 py-2.5 text-right font-medium">Total</th><th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {q.data.items.map((i) => (
                    <tr key={i.id} className="hover:bg-surface-muted">
                      <td className="px-4 py-3 font-medium"><Link href={`/organizations/${o}/invoices/${i.id}`} className="underline-offset-2 hover:underline">{i.number}</Link></td>
                      <td className="px-4 py-3 text-muted-foreground">{nameOf.get(i.clientId) ?? "Client"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatCalendarDate(i.dueDate)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatMoney(i.totalCents, i.currency)}</td>
                      <td className="px-4 py-3"><InvoiceStatusBadge status={i.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination meta={q.data.meta} />
          </>
        )}
    </div>
  );
}
