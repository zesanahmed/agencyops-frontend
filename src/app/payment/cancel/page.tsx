import type { Metadata } from "next";
import Link from "next/link";
import { CircleSlash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPage } from "@/components/shared/status-page";

export const metadata: Metadata = { title: "Payment cancelled", robots: { index: false } };

export default function PaymentCancelPage() {
  return (
    <StatusPage icon={CircleSlash} tone="warning" title="Payment cancelled"
      actions={<><Button asChild><Link href="/organizations">Back to workspace</Link></Button></>}>
      <p>No payment was taken. You can return to your invoice and try again whenever you&apos;re ready.</p>
    </StatusPage>
  );
}
