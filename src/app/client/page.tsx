import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { PendingFeature } from "@/components/client/pending-feature";

export const metadata: Metadata = { title: "Client portal · Client portal", robots: { index: false } };

export default function Page() {
  return <PendingFeature icon={LayoutDashboard} title="Client portal" description="Project visibility for the agencies you work with." summary="A calm, read-only view of your projects, files and invoices, separate from the agency's internal workspace. Clients are not organization members, so access is granted per project rather than through roles." plans={["Project progress and milestones shared by the agency","Files exchanged on your projects","Invoices, with secure online payment"]} />;
}
