import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "@/features/auth/register-form";

export const metadata: Metadata = { title: "Create account", description: "Create your AgencyOps account and set up your organization." };

export default function RegisterPage() {
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Then create an organization or accept an invitation.</p>
      </div>
      <Suspense><RegisterForm /></Suspense>
    </>
  );
}
