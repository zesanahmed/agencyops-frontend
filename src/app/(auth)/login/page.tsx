import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to your AgencyOps workspace." };

export default function LoginPage() {
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your workspace.</p>
      </div>
      <Suspense><LoginForm /></Suspense>
    </>
  );
}
