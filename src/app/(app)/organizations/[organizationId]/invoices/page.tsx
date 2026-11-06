import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { InvoicesView } from "@/features/invoices/invoices-view";

export const metadata: Metadata = { title: "Invoices" };

export default function InvoicesPage() {
  return (
    <>
      <PageHeader title="Invoices" description="Bill clients, track what's awaiting payment, and see what's been paid." />
      <Suspense><InvoicesView /></Suspense>
    </>
  );
}
