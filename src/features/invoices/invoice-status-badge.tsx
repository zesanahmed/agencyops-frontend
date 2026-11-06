import { Ban, CheckCircle2, FileEdit, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { InvoiceStatus, PaymentStatus } from "@/types/domain";

const INVOICE: Record<InvoiceStatus, { label: string; tone: BadgeTone; icon: LucideIcon }> = {
  DRAFT: { label: "Draft", tone: "neutral", icon: FileEdit },
  OPEN: { label: "Awaiting payment", tone: "warning", icon: Send },
  PAID: { label: "Paid", tone: "success", icon: CheckCircle2 },
  VOID: { label: "Void", tone: "neutral", icon: Ban },
};
export const invoiceStatusLabel = (s: InvoiceStatus) => INVOICE[s].label;

/** Icon + text, never colour alone. */
export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const d = INVOICE[status];
  const Icon = d.icon;
  return <Badge tone={d.tone}><Icon className="size-3" aria-hidden />{d.label}</Badge>;
}

const PAYMENT: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Pending", tone: "info" }, SUCCEEDED: { label: "Succeeded", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" }, CANCELED: { label: "Canceled", tone: "neutral" },
};
export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => <Badge tone={PAYMENT[status].tone}>{PAYMENT[status].label}</Badge>;
