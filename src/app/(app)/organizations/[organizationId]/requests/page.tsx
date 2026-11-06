import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { RequestsInbox } from "@/features/client-portal/requests-inbox";

export const metadata: Metadata = { title: "Client requests" };

export default function RequestsPage() {
  return (
    <>
      <PageHeader title="Client requests" description="Questions, change requests and issues your clients raise from their portal." />
      <Suspense><RequestsInbox /></Suspense>
    </>
  );
}
