import { AtSign, Bell, type LucideIcon } from "lucide-react";
import type { AppNotification } from "@/types/domain";

export interface NotificationKind { label: string; icon: LucideIcon }

const KINDS: Record<string, NotificationKind> = {
  MENTION: { label: "Mention", icon: AtSign },
};

const humanize = (type: string) => type.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** How a notification type looks. Types the app doesn't know yet (the backend may add more) fall back to a bell and a readable label. */
export function notificationKind(type: string): NotificationKind {
  return KINDS[type] ?? { label: humanize(type) || "Notification", icon: Bell };
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
export function groupByDay(items: AppNotification[], now: number = Date.now()): { label: DayBucket; items: AppNotification[] }[] {
  const groups: { label: DayBucket; items: AppNotification[] }[] = [];
  for (const n of items) {
    const label = dayBucket(n.createdAt, now);
    const last = groups.at(-1);
    if (last && last.label === label) last.items.push(n); else groups.push({ label, items: [n] });
  }
  return groups;
}
