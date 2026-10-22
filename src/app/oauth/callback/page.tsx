import type { Metadata } from "next";
import { Suspense } from "react";
import { OAuthCallbackView } from "@/features/auth/oauth-callback-view";

export const metadata: Metadata = { title: "Signing in", robots: { index: false } };

export default function OAuthCallbackPage() {
  return <Suspense><OAuthCallbackView /></Suspense>;
}
