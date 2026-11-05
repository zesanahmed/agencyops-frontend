"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { portalAuthApi, type PortalAuthResult } from "@/lib/api/services";
import { refreshPortalSession } from "@/lib/api/portal-client";
import { ApiError } from "@/lib/api/errors";
import { clearPortalSessionFlag, hasPortalSessionFlag, setPortalSessionFlag } from "@/lib/auth/session-flag";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import type { PortalContact } from "@/types/domain";

interface PortalAuthContextValue {
  contact: PortalContact | null;
  status: "unknown" | "authenticated" | "anonymous" | "unavailable";
  login: (input: { organizationSlug: string; email: string; password: string }) => Promise<PortalContact>;
  acceptInvite: (input: { token: string; password: string }) => Promise<PortalContact>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  retry: () => Promise<void>;
}

const Ctx = createContext<PortalAuthContextValue | null>(null);
export const PORTAL_LOGIN_PATH = "/client/login";

/** Session handling for the client portal: the same shape as the staff AuthProvider, on the portal's own tokens and cookie. */
export function PortalAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const contact = usePortalAuthStore((s) => s.contact);
  const status = usePortalAuthStore((s) => s.status);

  const restore = useCallback(async (isCancelled: () => boolean = () => false) => {
    const store = usePortalAuthStore.getState();
    const endSession = () => { clearPortalSessionFlag(); usePortalAuthStore.getState().clear(); };
    if (!hasPortalSessionFlag()) { store.clear(); return; }
    store.setStatus("unknown");
    const outcome = await refreshPortalSession();
    if (isCancelled()) return;
    if (outcome.kind === "rejected") return endSession();
    if (outcome.kind === "unavailable") { usePortalAuthStore.getState().setStatus("unavailable"); return; }
    try {
      const me = await portalAuthApi.me();
      if (isCancelled()) return;
      usePortalAuthStore.setState({ contact: me, status: "authenticated" });
      setPortalSessionFlag();
    } catch (e) {
      if (isCancelled()) return;
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) endSession();
      else usePortalAuthStore.getState().setStatus("unavailable");
    }
  }, []);

  useEffect(() => {
    if (usePortalAuthStore.getState().status !== "unknown") return;
    let cancelled = false;
    void restore(() => cancelled);
    return () => { cancelled = true; };
  }, [restore]);

  useEffect(() => { if (status === "anonymous") clearPortalSessionFlag(); }, [status]);

  const finish = useCallback(async (r: PortalAuthResult): Promise<PortalContact> => {
    usePortalAuthStore.getState().setAccessToken(r.accessToken);
    const c = r.contact?.id ? r.contact : await portalAuthApi.me();
    usePortalAuthStore.setState({ contact: c, status: "authenticated", signedOut: false });
    setPortalSessionFlag();
    return c;
  }, []);

  const end = useCallback(() => {
    usePortalAuthStore.getState().clear({ explicit: true });
    clearPortalSessionFlag();
    queryClient.removeQueries({ queryKey: ["portal"] }); // only the portal's cache; a staff session in the same tab is untouched
    router.replace(PORTAL_LOGIN_PATH);
  }, [queryClient, router]);

  const value = useMemo<PortalAuthContextValue>(() => ({
    contact, status,
    login: async (input) => finish(await portalAuthApi.login(input)),
    acceptInvite: async (input) => finish(await portalAuthApi.acceptInvite(input)),
    logout: async () => { try { await portalAuthApi.logout(); } finally { end(); } },
    logoutAll: async () => { try { await portalAuthApi.logoutAll(); } finally { end(); } },
    retry: () => restore(),
  }), [contact, status, finish, end, restore]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePortalAuth(): PortalAuthContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePortalAuth must be used within <PortalAuthProvider>");
  return ctx;
}
