import type { Metadata } from "next";
import Link from "next/link";
import { CircleSlash } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StatusPage } from "@/components/shared/status-page";

export const metadata: Metadata = { title: "Payment cancelled", robots: { index: false } };

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Stripe sends users here when they back out of Checkout: /payment/cancel?type=subscription&organizationId=… or ?type=invoice&invoiceId=… */
export default async function PaymentCancelPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const type = one(sp.type);
  const orgId = one(sp.organizationId);
  const back = type === "subscription" && SAFE_ID.test(orgId)
    ? { href: `/organizations/${orgId}/settings`, label: "Back to settings" }
    : type === "invoice" ? { href: "/client/invoices", label: "Back to your invoices" } : { href: "/organizations", label: "Back to workspace" };
  return (
    <StatusPage icon={CircleSlash} tone="warning" title="Payment cancelled"
      actions={<Link href={back.href} className={buttonVariants()}>{back.label}</Link>}>
      <p>No payment was taken. You can try again whenever you&apos;re ready.</p>
    </StatusPage>
  );
}
