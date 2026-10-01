import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { PendingFeature } from "@/components/client/pending-feature";

export const metadata: Metadata = { title: "Invoices · Client portal", robots: { index: false } };

export default function Page() {
  return <PendingFeature icon={Receipt} title="Invoices" description="Billing history and payments." summary="Invoices and card payment (Stripe, test mode first) will appear here once billing is released. Payment status will always come from the server, never from the browser redirect." plans={["Invoice list with server-confirmed payment state","Downloadable PDF invoices"]} />;
}
