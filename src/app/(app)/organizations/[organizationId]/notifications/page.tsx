import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationsView } from "@/features/notifications/notifications-view";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return (
    <>
      <PageHeader title="Notifications" description="Mentions and updates for this organization." />
      <Suspense><NotificationsView /></Suspense>
    </>
  );
}
