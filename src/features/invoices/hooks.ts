"use client";

import { useQuery } from "@tanstack/react-query";
import { invoiceApi, type InvoiceBody } from "@/lib/api/services";
import { qk } from "@/lib/query-keys";
import { useAction } from "@/lib/use-action";
import { useAuthStore } from "@/stores/auth-store";

const useAuthed = () => useAuthStore((s) => s.status === "authenticated");
const orgInvoices = (o: string) => ["organizations", o, "invoices"] as const;

export type InvoiceListParams = { page?: number; limit?: number; status?: string; clientId?: string; projectId?: string };

export function useInvoices(o: string, params: InvoiceListParams) {
  const authed = useAuthed();
  return useQuery({ queryKey: qk.invoices(o, params), queryFn: () => invoiceApi.list(o, params), enabled: authed, placeholderData: (p) => p });
}
/** `poll` re-reads every 3 s (used while a PDF is being rendered by the worker). */
export function useInvoice(o: string, id: string, poll = false) {
  const authed = useAuthed();
  return useQuery({ queryKey: qk.invoice(o, id), queryFn: () => invoiceApi.get(o, id), enabled: authed, refetchInterval: poll ? 3000 : false });
}

export const useCreateInvoice = (o: string) => useAction({ fn: (b: InvoiceBody) => invoiceApi.create(o, b), invalidate: [orgInvoices(o)], success: (i) => `Invoice ${i.number} created` });
export const useUpdateInvoice = (o: string, id: string) => useAction({ fn: (b: Omit<InvoiceBody, "clientId">) => invoiceApi.update(o, id, b), invalidate: [orgInvoices(o)], success: "Invoice updated" });
export const useSendInvoice = (o: string, id: string) => useAction({ fn: () => invoiceApi.send(o, id), invalidate: [orgInvoices(o)], success: (i) => `Invoice ${i.number} sent` });
export const useVoidInvoice = (o: string, id: string) => useAction({ fn: () => invoiceApi.void(o, id), invalidate: [orgInvoices(o)], success: "Invoice voided" });
export const useRequestInvoicePdf = (o: string, id: string) => useAction({ fn: () => invoiceApi.requestPdf(o, id), success: "PDF is being generated" });
