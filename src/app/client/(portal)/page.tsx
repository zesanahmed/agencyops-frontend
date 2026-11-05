import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { PortalProjectsView } from "@/features/portal/portal-projects-view";

export const metadata: Metadata = { title: "Projects · Client portal", robots: { index: false } };

export default function PortalProjectsPage() {
  return (
    <>
      <PageHeader title="Projects" description="The projects your agency has shared with you." />
      <PortalProjectsView />
    </>
  );
}
