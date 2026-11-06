import { CircleCheck, CircleDot, CircleX, Eye, type LucideIcon } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { RequestStatus, RequestType } from "@/types/domain";

export const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  NEW_REQUIREMENT: "New requirement", CHANGE_REQUEST: "Change request", QUESTION: "Question", FEEDBACK: "Feedback", ISSUE: "Issue",
};
const STATUS: Record<RequestStatus, { label: string; tone: BadgeTone; icon: LucideIcon }> = {
  OPEN: { label: "Open", tone: "info", icon: CircleDot },
  IN_REVIEW: { label: "In review", tone: "warning", icon: Eye },
  RESOLVED: { label: "Resolved", tone: "success", icon: CircleCheck },
  REJECTED: { label: "Rejected", tone: "neutral", icon: CircleX },
};
export const requestStatusLabel = (s: RequestStatus) => STATUS[s].label;

/** Icon + text, never colour alone. */
export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const d = STATUS[status];
  const Icon = d.icon;
  return <Badge tone={d.tone}><Icon className="size-3" aria-hidden />{d.label}</Badge>;
}
