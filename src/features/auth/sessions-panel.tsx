"use client";

import { useQuery } from "@tanstack/react-query";
import { Laptop } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { authApi } from "@/lib/api/services";
import { formatDateTime, timeAgo } from "@/lib/format";
import { useAction } from "@/lib/use-action";
import { qk } from "@/lib/query-keys";
import { describeUserAgent } from "./session-meta";

/** Active sign-ins. The current one is labelled and has no revoke button (use "Sign out" for it). */
export function SessionsPanel() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: qk.sessions, queryFn: () => authApi.sessions() });
  const revoke = useAction({ fn: (id: string) => authApi.revokeSession(id), invalidate: [qk.sessions], success: "Session signed out" });

  if (isLoading) return <div className="space-y-2" role="status" aria-label="Loading sessions">{[0, 1].map((i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load your sessions" />;
  if (!data?.length) return <p className="text-sm text-muted-foreground">No active sessions.</p>;

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
      {data.map((s) => (
        <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Laptop className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium"><span title={s.userAgent ?? undefined}>{describeUserAgent(s.userAgent)}</span>{s.current ? <Badge tone="success">This device</Badge> : null}</p>
            <p className="text-xs text-muted-foreground">
              {s.ipAddress ? `${s.ipAddress} · ` : ""}Signed in <time dateTime={s.createdAt} title={formatDateTime(s.createdAt)}>{timeAgo(s.createdAt)}</time>
              {s.lastUsedAt ? <> · active <time dateTime={s.lastUsedAt} title={formatDateTime(s.lastUsedAt)}>{timeAgo(s.lastUsedAt)}</time></> : null}
            </p>
          </div>
          {!s.current ? <Button variant="secondary" size="sm" loading={revoke.isPending && revoke.variables === s.id} onClick={() => revoke.mutate(s.id)} aria-label={`Sign out ${describeUserAgent(s.userAgent)}`}>Sign out</Button> : null}
        </li>
      ))}
    </ul>
  );
}
