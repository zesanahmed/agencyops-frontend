"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useOrg } from "@/features/organizations/org-context";
import { useInvoice } from "./hooks";
import { InvoiceWizardGate } from "./invoice-wizard";

/** Only drafts are editable (the backend answers 409 otherwise); anything else is sent back to the read-only view. */
export function EditInvoice({ invoiceId }: { invoiceId: string }) {
  const { organizationId: o } = useOrg();
  const q = useInvoice(o, invoiceId);
  if (q.data && q.data.status !== "DRAFT")
    return (
      <>
        <PageHeader title={`${q.data.number} can't be edited`} description="Only draft invoices can be changed. Void it and create a new one if something is wrong." />
        <Button asChild variant="secondary"><Link href={`/organizations/${o}/invoices/${invoiceId}`}>Back to the invoice</Link></Button>
      </>
    );
  return (
    <>
      <PageHeader title={q.data ? `Edit ${q.data.number}` : "Edit invoice"} description="Changes are saved to the draft." />
      <InvoiceWizardGate invoice={q.data} isLoading={q.isLoading} error={q.error} onRetry={() => q.refetch()} />
    </>
  );
}
