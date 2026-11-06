import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { PortalInvoicesView } from "@/features/portal/portal-invoices-view";

export const metadata: Metadata = { title: "Invoices · Client portal", robots: { index: false } };

export default function PortalInvoicesPage() {
  return (
    <>
      <PageHeader title="Invoices" description="What your agency has billed you, and what's left to pay." />
      <Suspense><PortalInvoicesView /></Suspense>
    </>
  );
}
