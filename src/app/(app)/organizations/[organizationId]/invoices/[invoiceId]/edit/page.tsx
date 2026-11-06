import type { Metadata } from "next";
import { EditInvoice } from "@/features/invoices/edit-invoice";

export const metadata: Metadata = { title: "Edit invoice" };

export default async function EditInvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  return <EditInvoice invoiceId={invoiceId} />;
}
