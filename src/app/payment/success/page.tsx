import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentSuccessView } from "@/features/billing/payment-status-view";

export const metadata: Metadata = { title: "Payment received", robots: { index: false } };

export default function PaymentSuccessPage() {
  return <Suspense><PaymentSuccessView /></Suspense>;
}
