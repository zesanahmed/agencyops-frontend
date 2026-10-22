import { AtSign, Bell, FileText, MessageSquare, Play, Receipt, UserCheck, ArrowRightLeft, ClipboardList, CircleAlert, type LucideIcon } from "lucide-react";
import type { AppNotification } from "@/types/domain";

export interface NotificationKind { label: string; icon: LucideIcon }

const KINDS: Record<string, NotificationKind> = {
  MENTION: { label: "Mention", icon: AtSign },
  TASK_ASSIGNED: { label: "Assigned to you", icon: UserCheck },
  TASK_STATUS_CHANGED: { label: "Status change", icon: ArrowRightLeft },
  SPRINT_STARTED: { label: "Sprint started", icon: Play },
  CLIENT_MESSAGE: { label: "Client message", icon: MessageSquare },
  CLIENT_REQUEST: { label: "Client request", icon: ClipboardList },
  CLIENT_FILE: { label: "Client file", icon: FileText },
  INVOICE_PAID: { label: "Invoice paid", icon: Receipt },
  INVOICE_PAYMENT_ATTENTION: { label: "Payment needs review", icon: CircleAlert },
};


const humanize = (type: string) => type.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** How a notification type looks. Types the app doesn't know yet (the backend may add more) fall back to a bell and a readable label. */
export function notificationKind(type: string): NotificationKind {
  return KINDS[type] ?? { label: humanize(type) || "Notification", icon: Bell };
}

/**
 * Where a notification leads (FRONTEND_CONTRACT §3.7). Null when the target has no internal page, or its ids are missing
 * (older notifications written before `data` existed). Invoice targets get a page in the billing phase.
 */
export function notificationHref(organizationId: string, n: Pick<AppNotification, "type" | "data">): string | null {
  const d = n.data;
  if (!d) return null;
  const base = `/organizations/${organizationId}`;
  if (d.projectId && d.taskId) return `${base}/projects/${d.projectId}/tasks/${d.taskId}`;
  if (d.projectId && d.sprintId) return `${base}/projects/${d.projectId}?tab=sprints`;
  if (d.projectId) return `${base}/projects/${d.projectId}`;
  return null;
}

export type DayBucket = "Today" | "Yesterday" | "Earlier";

const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** Local-calendar bucket for a timestamp. */
export function dayBucket(iso: string, now: number = Date.now()): DayBucket {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Earlier";
  const today = startOfDay(now);
  if (t >= today) return "Today";
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  return t >= yesterday.getTime() ? "Yesterday" : "Earlier";
}

/** Groups an already newest-first list into Today / Yesterday / Earlier, keeping order and dropping empty groups. */
export function groupByDay<T extends { createdAt: string }>(items: T[], now: number = Date.now()): { label: DayBucket; items: T[] }[] {
  const groups: { label: DayBucket; items: T[] }[] = [];
  for (const n of items) {
    const label = dayBucket(n.createdAt, now);
    const last = groups.at(-1);
    if (last && last.label === label) last.items.push(n); else groups.push({ label, items: [n] });
  }
  return groups;
}
