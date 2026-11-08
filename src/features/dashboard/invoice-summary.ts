import type { Invoice } from "@/types/domain";

export interface InvoiceSummary {
  currency: string;
  /** More than one currency was found: only the most common one is summed (amounts in different currencies can't be added). */
  mixedCurrencies: boolean;
  paidCents: number;
  awaitingCents: number;
  draftCents: number;
  counts: { paid: number; awaiting: number; draft: number };
  /** Invoices counted (void ones are excluded). */
  considered: number;
}

/**
 * Totals by status for the billing chart. Void invoices are not money owed or earned, so they're left out. Currencies are never
 * mixed: with more than one, the most frequent currency wins and `mixedCurrencies` says so.
 */
export function summarizeInvoices(invoices: Invoice[]): InvoiceSummary | null {
  const live = invoices.filter((i) => i.status !== "VOID");
  if (!live.length) return null;
  const byCurrency = new Map<string, number>();
  for (const i of live) byCurrency.set(i.currency, (byCurrency.get(i.currency) ?? 0) + 1);
  const [currency] = [...byCurrency.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const s: InvoiceSummary = { currency, mixedCurrencies: byCurrency.size > 1, paidCents: 0, awaitingCents: 0, draftCents: 0, counts: { paid: 0, awaiting: 0, draft: 0 }, considered: 0 };
  for (const i of live) {
    if (i.currency !== currency) continue;
    s.considered++;
    if (i.status === "PAID") { s.paidCents += i.totalCents; s.counts.paid++; }
    else if (i.status === "OPEN") { s.awaitingCents += i.totalCents; s.counts.awaiting++; }
    else { s.draftCents += i.totalCents; s.counts.draft++; }
  }
  return s;
}
