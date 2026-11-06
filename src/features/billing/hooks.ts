"use client";

import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/lib/api/services";
import { qk } from "@/lib/query-keys";
import { useAction } from "@/lib/use-action";
import { useAuthStore } from "@/stores/auth-store";

export function useBilling(o: string, opts: { enabled?: boolean; refetchInterval?: number | false } = {}) {
  const authed = useAuthStore((s) => s.status === "authenticated");
  return useQuery({ queryKey: qk.billing(o), queryFn: () => billingApi.get(o), enabled: authed && !!o && (opts.enabled ?? true), refetchInterval: opts.refetchInterval ?? false });
}

/** Both return a Stripe-hosted URL; the browser leaves the app to use it. Nothing is changed locally on the way out. */
export const useStartCheckout = (o: string) => useAction({ fn: () => billingApi.checkout(o) });
export const useOpenBillingPortal = (o: string) => useAction({ fn: () => billingApi.portal(o) });
