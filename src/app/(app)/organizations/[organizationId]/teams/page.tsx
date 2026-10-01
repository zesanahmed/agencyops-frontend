import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { TeamsView } from "@/features/teams/teams-view";

export const metadata: Metadata = { title: "Teams" };

export default function Page() {
  return (
    <>
      <PageHeader title="Teams" description="People organized into operational units, assigned to projects." />
      <Suspense><TeamsView /></Suspense>
    </>
  );
}
