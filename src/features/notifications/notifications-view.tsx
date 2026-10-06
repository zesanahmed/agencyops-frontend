"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Pagination } from "@/components/shared/pagination";
import { useOrg } from "@/features/organizations/org-context";
import { qk } from "@/features/organizations/hooks";
import { useUrlState } from "@/hooks/use-url-state";
import { notificationApi } from "@/lib/api/services";
import { timeAgo } from "@/lib/format";
import { useAction } from "@/lib/use-action";
import { cn } from "@/lib/utils";

export function NotificationsView() {
  const { organizationId: o } = useOrg();
  const { get, set, page } = useUrlState();
  const unreadOnly = get("filter") === "unread";
  const params = { page, limit: 20, unreadOnly };
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: qk.notifications(o, params), queryFn: () => notificationApi.list(o, params), placeholderData: (p) => p });
  const inv = [["organizations", o, "notifications"]];
  const markOne = useAction({ fn: (id: string) => notificationApi.markRead(o, id), invalidate: inv });
  const markAll = useAction({ fn: () => notificationApi.markAllRead(o), invalidate: inv, success: "All caught up" });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Filter notifications" className="inline-flex rounded-md border border-border-strong p-0.5">
          {[{ v: "", l: "All" }, { v: "unread", l: "Unread" }].map((f) => (
            <button key={f.v} aria-pressed={get("filter") === f.v} onClick={() => set({ filter: f.v })}
              className={cn("rounded-sm px-3 py-1 text-sm", get("filter") === f.v ? "bg-primary-soft font-medium text-primary" : "text-muted-foreground hover:text-foreground")}>{f.l}</button>
          ))}
        </div>
        <Button variant="secondary" size="sm" loading={markAll.isPending} onClick={() => markAll.mutate(undefined)}><CheckCheck /> Mark all read</Button>
      </div>
      {isLoading ? <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        : isError ? <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load notifications" />
        : !data?.items.length ? <EmptyState icon={unreadOnly ? BellOff : Bell} title={unreadOnly ? "Nothing unread" : "No notifications yet"} description={unreadOnly ? "You're all caught up." : "Mentions and assignments will show up here."} />
        : (<>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {data.items.map((n) => {
              const unread = !n.readAt;
              return (
                <li key={n.id} className={cn("flex items-start gap-3 px-4 py-3", unread && "bg-primary-soft/40")}>
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", unread ? "bg-primary" : "bg-transparent")} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm"><span className="sr-only">{unread ? "Unread: " : ""}</span><span className={unread ? "font-medium" : undefined}>{n.title}</span></p>
                    {n.message ? <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">{n.type.toLowerCase().replace(/_/g, " ")} · {timeAgo(n.createdAt)}</p>
                  </div>
                  {unread ? <Button variant="ghost" size="sm" loading={markOne.isPending && markOne.variables === n.id} onClick={() => markOne.mutate(n.id)}>Mark read</Button> : null}
                </li>
              );
            })}
          </ul>
          <Pagination meta={data.meta} />
        </>)}
    </div>
  );
}
