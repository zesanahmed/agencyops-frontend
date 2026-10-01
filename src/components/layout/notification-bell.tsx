"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { notificationApi } from "@/lib/api/services";
import { qk, useOrganization } from "@/features/organizations/hooks";
import { useAuthStore } from "@/stores/auth-store";

/** Same query key as the sidebar badge, so both share one request. */
export function NotificationBell({ organizationId }: { organizationId: string }) {
  const authed = useAuthStore((s) => s.status === "authenticated");
  const org = useOrganization(organizationId); // only count once the org is known to be accessible
  const unread = useQuery({
    queryKey: qk.notifications(organizationId, { unreadOnly: true, limit: 1 }),
    queryFn: () => notificationApi.list(organizationId, { unreadOnly: true, limit: 1 }),
    enabled: authed && org.isSuccess, refetchInterval: 60_000,
  });
  const n = unread.data?.meta.total ?? 0;
  return (
    <Link href={`/organizations/${organizationId}/notifications`} className="relative inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      aria-label={n ? `Notifications, ${n} unread` : "Notifications"}>
      <Bell className="size-4" aria-hidden />
      {n ? <span className="absolute right-1 top-1 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-primary-foreground" aria-hidden>{n > 99 ? "99+" : n}</span> : null}
    </Link>
  );
}
