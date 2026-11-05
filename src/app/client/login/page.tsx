import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalAuthCard } from "@/components/client/portal-auth-card";
import { PortalLoginForm } from "@/features/portal/portal-login-form";

export const metadata: Metadata = { title: "Client portal sign in", description: "Sign in to follow your projects, share files and pay invoices.", robots: { index: false } };

export default function ClientLoginPage() {
  return (
    <PortalAuthCard title="Sign in to your portal" description="Follow your projects, share files and pay invoices.">
      <Suspense><PortalLoginForm /></Suspense>
    </PortalAuthCard>
  );
}
