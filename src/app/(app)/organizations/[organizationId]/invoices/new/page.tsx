import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { InvoiceWizard } from "@/features/invoices/invoice-wizard";

export const metadata: Metadata = { title: "New invoice" };

export default function NewInvoicePage() {
  return (
    <>
      <PageHeader title="New invoice" description="Three short steps. It's saved as a draft until you send it." />
      <InvoiceWizard />
    </>
  );
}
