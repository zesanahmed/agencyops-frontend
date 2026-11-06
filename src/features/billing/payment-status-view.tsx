"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, CircleAlert, Hourglass, Loader2, LogIn } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StatusPage } from "@/components/shared/status-page";
import { useAuth } from "@/features/auth/auth-provider";
import { PortalAuthProvider, usePortalAuth } from "@/features/portal/portal-auth-provider";
import { portalInvoicesApi } from "@/lib/api/services";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import { useQuery } from "@tanstack/react-query";
import { useBilling } from "./hooks";

/** How long to wait for the verified webhook before saying "still processing" (FRONTEND_CONTRACT §4: poll every 2 s for ~30 s). */
export const POLL_INTERVAL_MS = 2000;
export const POLL_TIMEOUT_MS = 30_000;
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
const SESSION_ID = /^[A-Za-z0-9_]{1,255}$/;

/**
 * Where Stripe sends the browser back to. The redirect itself proves nothing: the plan only changes when the backend
 * receives Stripe's signed webhook. So this page polls the server and shows "paid" only when the server says so.
 */
export function PaymentSuccessView() {
  const params = useSearchParams();
  const type = params.get("type");
  const rawOrg = params.get("organizationId") ?? "";
  const organizationId = SAFE_ID.test(rawOrg) ? rawOrg : "";

  if (type === "subscription" && organizationId) return <SubscriptionConfirmation organizationId={organizationId} />;
  const invoiceId = params.get("invoiceId") ?? "";
  if (type === "invoice" && SAFE_ID.test(invoiceId)) {
    const sid = params.get("session_id") ?? "";
    // Own provider: this page lives outside /client, but the invoice belongs to a portal contact's session.
    return <PortalAuthProvider><InvoiceConfirmation invoiceId={invoiceId} sessionId={SESSION_ID.test(sid) ? sid : undefined} /></PortalAuthProvider>;
  }
  return (
    <StatusPage icon={CircleAlert} tone="warning" title="Nothing to confirm here" actions={<Link href="/organizations" className={buttonVariants()}>Go to your workspace</Link>}>
      This page needs the link Stripe sends you back to after checkout.
    </StatusPage>
  );
}

function SubscriptionConfirmation({ organizationId }: { organizationId: string }) {
  const { status } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const q = useBilling(organizationId, { refetchInterval: confirmed || timedOut ? false : POLL_INTERVAL_MS });
  const isPro = q.data?.plan.code === "PRO";
  if (isPro && !confirmed) setConfirmed(true);

  useEffect(() => {
    if (confirmed || status !== "authenticated") return;
    const t = setTimeout(() => setTimedOut(true), POLL_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [confirmed, status]);

  const settings = `/organizations/${organizationId}/settings`;
  if (status === "anonymous")
    return (
      <StatusPage icon={LogIn} tone="neutral" title="Sign in to see your plan" actions={<Link href={`/login?next=${encodeURIComponent(settings)}`} className={buttonVariants()}>Sign in</Link>}>
        Your payment is confirmed by our server regardless of this page. Sign in to check your plan.
      </StatusPage>
    );
  if (confirmed)
    return (
      <StatusPage icon={CheckCircle2} tone="success" title="You're on Pro" actions={<Link href={settings} className={buttonVariants()}>Back to settings</Link>}>
        <span role="status">Payment confirmed. Thanks for upgrading.</span>
      </StatusPage>
    );
  if (q.isError && !timedOut)
    return (
      <StatusPage icon={CircleAlert} tone="warning" title="We couldn't check your plan" actions={<Link href={settings} className={buttonVariants({ variant: "secondary" })}>Back to settings</Link>}>
        <span role="alert">If you completed the payment, your plan will update shortly. Check Plan &amp; billing in settings in a minute.</span>
      </StatusPage>
    );
  if (timedOut)
    return (
      <StatusPage icon={Hourglass} tone="neutral" title="Payment is processing" actions={<Link href={settings} className={buttonVariants()}>Back to settings</Link>}>
        <span role="status">We haven&apos;t received the confirmation yet. Your plan updates automatically once we do; nothing more is needed from you.</span>
      </StatusPage>
    );
  return <StatusPage icon={Loader2} tone="neutral" title="Confirming your payment…"><span role="status">This usually takes a few seconds.</span></StatusPage>;
}

/**
 * Invoice payments (client portal). `confirmed` comes from the server after the signed Stripe webhook; arriving here proves
 * nothing. FAILED/CANCELED/void outcomes are reported as such, and a timeout says "processing", never "paid".
 */
function InvoiceConfirmation({ invoiceId, sessionId }: { invoiceId: string; sessionId?: string }) {
  const { status } = usePortalAuth();
  const authed = usePortalAuthStore((s) => s.status === "authenticated");
  const [timedOut, setTimedOut] = useState(false);
  const [settled, setSettled] = useState(false);
  const q = useQuery({
    queryKey: ["portal", "invoices", invoiceId, "payment-status", sessionId ?? ""],
    queryFn: () => portalInvoicesApi.paymentStatus(invoiceId, sessionId),
    enabled: authed,
    refetchInterval: settled || timedOut ? false : POLL_INTERVAL_MS,
  });
  const s = q.data;
  const failed = s?.payment?.status === "FAILED";
  const canceled = s?.payment?.status === "CANCELED";
  const voided = s?.invoiceStatus === "VOID";
  const done = Boolean(s?.confirmed) || failed || canceled || voided;
  if (done && !settled) setSettled(true);

  useEffect(() => {
    if (settled || status !== "authenticated") return;
    const t = setTimeout(() => setTimedOut(true), POLL_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [settled, status]);

  const invoice = `/client/invoices/${invoiceId}`;
  const back = <Link href={invoice} className={buttonVariants()}>View invoice</Link>;
  if (status === "anonymous")
    return (
      <StatusPage icon={LogIn} tone="neutral" title="Sign in to see your payment" actions={<Link href={`/client/login?next=${encodeURIComponent(invoice)}`} className={buttonVariants()}>Sign in</Link>}>
        Your payment is confirmed by our server regardless of this page. Sign in to check the invoice.
      </StatusPage>
    );
  if (s?.confirmed)
    return <StatusPage icon={CheckCircle2} tone="success" title="Payment received" actions={back}><span role="status">Your payment is confirmed and the invoice is marked as paid. Thank you.</span></StatusPage>;
  if (failed)
    return (
      <StatusPage icon={CircleAlert} tone="danger" title="Your payment didn't go through" actions={<Link href={invoice} className={buttonVariants()}>Try again</Link>}>
        <span role="alert">{s?.payment?.failureReason ?? "The payment was declined."} You have not been charged for this attempt.</span>
      </StatusPage>
    );
  if (canceled)
    return <StatusPage icon={CircleAlert} tone="warning" title="Payment cancelled" actions={back}><span role="status">No payment was taken. You can pay the invoice whenever you&apos;re ready.</span></StatusPage>;
  if (voided)
    return <StatusPage icon={CircleAlert} tone="warning" title="This invoice was cancelled" actions={back}><span role="status">Your agency cancelled this invoice, so it can&apos;t be paid. If you were charged, contact them: the payment will be reviewed.</span></StatusPage>;
  if (q.isError && !timedOut)
    return <StatusPage icon={CircleAlert} tone="warning" title="We couldn't check your payment" actions={back}><span role="alert">If you completed the payment, the invoice will update shortly.</span></StatusPage>;
  if (timedOut)
    return <StatusPage icon={Hourglass} tone="neutral" title="Payment is processing" actions={back}><span role="status">We haven&apos;t received the confirmation yet. The invoice updates automatically once we do; nothing more is needed from you.</span></StatusPage>;
  return <StatusPage icon={Loader2} tone="neutral" title="Confirming your payment…"><span role="status">This usually takes a few seconds.</span></StatusPage>;
}
