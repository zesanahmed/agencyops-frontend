import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { MembersView } from "@/features/members/members-view";

export const metadata: Metadata = { title: "Members" };

export default function Page() {
  return (
    <>
      <PageHeader title="Members" description="Everyone in this organization, their roles, and pending invitations." />
      <Suspense><MembersView /></Suspense>
    </>
  );
}
