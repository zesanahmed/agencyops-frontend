"use client";

import { useQuery } from "@tanstack/react-query";
import { qk } from "@/features/organizations/hooks";
import { notificationApi } from "@/lib/api/services";

/** Unread count for the header of the inbox. Same key and request as the bell and sidebar badge, so it costs no extra call. */
export function useUnreadCount(o: string) {
  const q = useQuery({ queryKey: qk.notifications(o, { unreadOnly: true, limit: 1 }), queryFn: () => notificationApi.list(o, { unreadOnly: true, limit: 1 }) });
  return { count: q.data?.meta.total ?? 0, isLoading: q.isLoading };
}
