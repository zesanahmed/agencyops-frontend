"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellOff, CheckCheck, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Pagination } from "@/components/shared/pagination";
import { useOrg } from "@/features/organizations/org-context";
import { qk } from "@/features/organizations/hooks";
import { useUrlState } from "@/hooks/use-url-state";
import { notificationApi } from "@/lib/api/services";
import { formatDateTime, timeAgo } from "@/lib/format";
import { useAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "./hooks";
import { groupByDay, notificationKind } from "./notification-meta";

export function NotificationsView() {
  const { organizationId: o } = useOrg();
  const { get, set, page } = useUrlState();
  const filter = get("filter") === "unread" ? "unread" : "";
  const unreadOnly = filter === "unread";
  const params = { page, limit: 20, unreadOnly };
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: qk.notifications(o, params), queryFn: () => notificationApi.list(o, params), placeholderData: (p) => p });
  const unread = useUnreadCount(o);
  const inv = [["organizations", o, "notifications"]];
  const markOne = useAction({ fn: (id: string) => notificationApi.markRead(o, id), invalidate: inv });
  const markAll = useAction({ fn: () => notificationApi.markAllRead(o), invalidate: inv, success: "All caught up" });

  // Marking the last item on a page read (Unread filter) can leave the current page past the end: step back to the last real page.
  useEffect(() => {
    if (data && !data.items.length && page > 1) set({ page: String(Math.max(1, data.meta.totalPages)) });
  }, [data, page, set]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Filter notifications" className="inline-flex rounded-md border border-border-strong p-0.5">
          {([{ v: "", l: "All" }, { v: "unread", l: unread.count ? `Unread (${unread.count > 99 ? "99+" : unread.count})` : "Unread" }] as const).map((f) => (
            <button key={f.v} type="button" aria-pressed={filter === f.v} onClick={() => set({ filter: f.v })}
              className={cn("rounded-sm px-3 py-1 text-sm", filter === f.v ? "bg-primary-soft font-medium text-primary" : "text-muted-foreground hover:text-foreground")}>{f.l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/organizations/${o}/settings`} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground"><Settings2 className="size-4" aria-hidden /> Preferences</Link>
          <Button variant="secondary" size="sm" loading={markAll.isPending} disabled={!unread.isLoading && unread.count === 0} onClick={() => markAll.mutate(undefined)}><CheckCheck /> Mark all read</Button>
        </div>
      </div>
      {isLoading ? <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        : isError ? <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load notifications" />
        : !data?.items.length ? <EmptyState icon={unreadOnly ? BellOff : Bell} title={unreadOnly ? "Nothing unread" : "No notifications yet"} description={unreadOnly ? "You're all caught up." : "When someone mentions you in a comment, it will show up here."}
            action={unreadOnly ? <Button variant="secondary" onClick={() => set({ filter: "" })}>Show all notifications</Button> : undefined} />
        : (<>
          <div className="space-y-5">
            {groupByDay(data.items).map((g) => (
              <section key={g.label} aria-label={g.label}>
                <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">{g.label}</h2>
                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
                  {g.items.map((n) => {
                    const isUnread = !n.readAt;
                    const kind = notificationKind(n.type);
                    return (
                      <li key={n.id} className={cn("flex items-start gap-3 px-4 py-3", isUnread && "bg-primary-soft/40")}>
                        <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", isUnread ? "bg-primary-soft text-primary" : "bg-surface-muted text-muted-foreground")}><kind.icon className="size-3.5" aria-hidden /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm"><span className="sr-only">{isUnread ? "Unread: " : ""}</span><span className={isUnread ? "font-medium" : undefined}>{n.title}</span></p>
                          {n.message ? <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-muted-foreground">{n.message}</p> : null}
                          <p className="mt-1 text-xs text-muted-foreground">{kind.label} · <time dateTime={n.createdAt} title={formatDateTime(n.createdAt)}>{timeAgo(n.createdAt)}</time></p>
                        </div>
                        {isUnread ? <Button variant="ghost" size="sm" loading={markOne.isPending && markOne.variables === n.id} onClick={() => markOne.mutate(n.id)}>Mark read</Button> : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
          <Pagination meta={data.meta} />
        </>)}
    </div>
  );
}
