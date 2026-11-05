import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalProjectDetail } from "@/features/portal/portal-project-detail";

export const metadata: Metadata = { title: "Project · Client portal", robots: { index: false } };

export default async function PortalProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <Suspense><PortalProjectDetail projectId={projectId} /></Suspense>;
}
