import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { MyWorkView } from "@/features/dashboard/my-work-view";

export const metadata: Metadata = { title: "My work" };

export default function Page() {
  return (
    <>
      <PageHeader title="My work" description="Tasks assigned to you across this organization's projects." />
      <Suspense><MyWorkView /></Suspense>
    </>
  );
}
