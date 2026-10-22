import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ActivityView } from "@/features/activity/activity-view";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <>
      <PageHeader title="Activity" description="What changed across projects, sprints, tasks and people, newest first." />
      <Suspense><ActivityView /></Suspense>
    </>
  );
}
