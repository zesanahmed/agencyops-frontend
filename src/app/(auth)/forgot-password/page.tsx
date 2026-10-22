import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export const metadata: Metadata = { title: "Forgot password", description: "Request a link to reset your AgencyOps password." };

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">Enter your e-mail and we&apos;ll send you a link to choose a new one.</p>
      </div>
      <ForgotPasswordForm />
    </>
  );
}
