import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">You&apos;ll be signed out everywhere and asked to sign in again.</p>
      </div>
      <Suspense><ResetPasswordForm /></Suspense>
    </>
  );
}
