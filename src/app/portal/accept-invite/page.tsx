import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalAuthCard } from "@/components/client/portal-auth-card";
import { AcceptInviteForm } from "@/features/portal/accept-invite-form";

export const metadata: Metadata = { title: "Accept your invitation", robots: { index: false } };

export default function AcceptInvitePage() {
  return (
    <PortalAuthCard title="Welcome aboard" description="Choose a password to open your client portal.">
      <Suspense><AcceptInviteForm /></Suspense>
    </PortalAuthCard>
  );
}
