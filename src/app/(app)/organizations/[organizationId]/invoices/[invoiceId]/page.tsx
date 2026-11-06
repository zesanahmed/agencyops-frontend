import type { Metadata } from "next";
import { Suspense } from "react";
import { InvoiceDetail } from "@/features/invoices/invoice-detail";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  return <Suspense><InvoiceDetail invoiceId={invoiceId} /></Suspense>;
}
