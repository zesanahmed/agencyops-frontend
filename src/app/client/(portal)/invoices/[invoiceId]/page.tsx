import type { Metadata } from "next";
import { PortalInvoiceDetail } from "@/features/portal/portal-invoice-detail";

export const metadata: Metadata = { title: "Invoice · Client portal", robots: { index: false } };

export default async function PortalInvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  return <PortalInvoiceDetail invoiceId={invoiceId} />;
}
