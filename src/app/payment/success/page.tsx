import type { Metadata } from "next";
import Link from "next/link";
import { Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPage } from "@/components/shared/status-page";

export const metadata: Metadata = { title: "Payment received", robots: { index: false } };

/**
 * Stripe redirects here after checkout. The redirect alone is NOT proof of
 * payment — the backend confirms via signed webhook. Until payment endpoints
 * exist, this page says so instead of claiming success.
 */
export default function PaymentSuccessPage() {
  return (
    <StatusPage icon={Hourglass} tone="neutral" title="Thanks — we're confirming your payment"
      actions={<><Button asChild><Link href="/organizations">Back to workspace</Link></Button></>}>
      <p>Payment status is confirmed by our server, not by this page. Once payments are live, the final state (paid or pending) will appear on your invoice.</p>
    </StatusPage>
  );
}
