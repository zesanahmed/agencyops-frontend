import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalFilesPage } from "@/features/portal/portal-files-page";

export const metadata: Metadata = { title: "Files · Client portal", robots: { index: false } };

export default function PortalFilesRoute() {
  return <Suspense><PortalFilesPage /></Suspense>;
}
