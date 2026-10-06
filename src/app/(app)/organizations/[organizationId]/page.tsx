import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Overview } from "@/features/dashboard/overview";

export const metadata: Metadata = { title: "Overview" };

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="What's active, what's in review and what needs attention across this organization."
      />
      <Suspense>
        <Overview />
      </Suspense>
    </>
  );
}
