"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useOrg } from "@/features/organizations/org-context";
import { qk } from "@/features/organizations/hooks";
import { mergePreferences } from "@/features/settings/preferences";
import { notificationApi } from "@/lib/api/services";
import { useAction } from "@/lib/use-action";
import { notificationKind } from "./notification-meta";

const CHANNELS = [["inAppEnabled", "In-app"], ["emailEnabled", "Email"]] as const;

/**
 * Per-type, per-channel switches. The backend only stores a row after the first change, so types with no row are
 * shown with the backend's defaults (on / on) and the first toggle creates the row (PUT upserts).
 */
export function NotificationPreferences() {
  const { organizationId: o } = useOrg();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: qk.prefs(o), queryFn: () => notificationApi.preferences(o) });
  const toggle = useAction({
    fn: (v: { notificationType: string; channel: "emailEnabled" | "inAppEnabled"; value: boolean }) => notificationApi.updatePreference(o, v.notificationType, { [v.channel]: v.value }),
    invalidate: [qk.prefs(o)],
    success: "Preference saved",
  });

  return (
    <>
      {isLoading ? <Skeleton className="h-24" /> : isError ? <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load preferences" />
        : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {mergePreferences(data ?? []).map((p) => {
              const kind = notificationKind(p.notificationType);
              return (
                <li key={p.notificationType} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium"><kind.icon className="size-4 text-muted-foreground" aria-hidden />{kind.label === "Mention" ? "Mentions" : kind.label}</span>
                  <div className="flex items-center gap-5">
                    {CHANNELS.map(([channel, label]) => (
                      <label key={channel} htmlFor={`pref-${p.notificationType}-${channel}`} className="flex items-center gap-2 text-sm">
                        <input id={`pref-${p.notificationType}-${channel}`} type="checkbox" role="switch" className="size-4 accent-(--primary)" checked={p[channel]} disabled={toggle.isPending}
                          onChange={(e) => toggle.mutate({ notificationType: p.notificationType, channel, value: e.target.checked })} />
                        {label}
                      </label>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      <p className="text-xs text-muted-foreground">Your choices are saved to your account. The backend doesn&apos;t apply them to in-app notifications yet, and email delivery isn&apos;t live, so for now they&apos;re stored for when it does.</p>
    </>
  );
}
