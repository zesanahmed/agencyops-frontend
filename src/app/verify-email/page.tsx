import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailView } from "@/features/auth/verify-email-view";

export const metadata: Metadata = { title: "Verify e-mail", robots: { index: false } };

export default function VerifyEmailPage() {
  return <Suspense><VerifyEmailView /></Suspense>;
}
