import type { Metadata } from "next";
import { Suspense } from "react";
import { ClientDetail } from "@/features/clients/client-detail";

export const metadata: Metadata = { title: "Client" };

export default async function ClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  return <Suspense><ClientDetail clientId={clientId} /></Suspense>;
}
