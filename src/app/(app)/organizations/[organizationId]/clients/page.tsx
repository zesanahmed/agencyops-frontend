import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ClientsView } from "@/features/clients/clients-view";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <>
      <PageHeader title="Clients" description="The companies you build for, the people who can sign in to their portal, and the projects they can see." />
      <Suspense><ClientsView /></Suspense>
    </>
  );
}
