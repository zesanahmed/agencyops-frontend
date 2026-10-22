"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { authApi, type AuthResult } from "@/lib/api/services";
import { refreshSession } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { clearSessionFlag, hasSessionFlag, setSessionFlag } from "@/lib/auth/session-flag";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types/domain";

interface AuthContextValue {
  user: User | null;
  status: "unknown" | "authenticated" | "anonymous" | "unavailable";
  login: (input: { email: string; password: string }) => Promise<User>;
  register: (input: { name: string; email: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  /** Re-run session restore after a connectivity failure. */
  retry: () => Promise<void>;
  /**
   * Finish a sign-in that happened in the browser (OAuth): the backend already set the refresh cookie, so trade it for an
   * access token and load the user. Resolves false when no session came out of it.
   */
  completeOAuth: () => Promise<boolean>;
  /** Re-read the current user (e.g. after verifying the e-mail address). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, status } = useAuthStore();

  /**
   * Restore the session from the HttpOnly refresh cookie. Only a definitive
   * rejection clears the hint cookie; connectivity problems (offline, 5xx, an
   * aborted request while the page unloads) leave it intact so the next load or
   * a retry can succeed. Wiping the hint on a blip would sign users out for no reason.
   */
  const restore = useCallback(async (isCancelled: () => boolean = () => false) => {
    const endSession = () => { clearSessionFlag(); useAuthStore.getState().clear(); };
    if (!hasSessionFlag()) {
      useAuthStore.getState().clear();
      return;
    }
    useAuthStore.getState().setStatus("unknown");
    const outcome = await refreshSession();
    if (isCancelled()) return;
    if (outcome.kind === "rejected") return endSession();
    if (outcome.kind === "unavailable") { useAuthStore.getState().setStatus("unavailable"); return; }
    try {
      const me = await authApi.me();
      if (isCancelled()) return;
      useAuthStore.setState({ user: me, status: "authenticated" });
      setSessionFlag();
    } catch (e) {
      if (isCancelled()) return;
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) endSession();
      else useAuthStore.getState().setStatus("unavailable");
    }
  }, []);

  useEffect(() => {
    if (useAuthStore.getState().status !== "unknown") return;
    let cancelled = false;
    void restore(() => cancelled);
    return () => { cancelled = true; };
  }, [restore]);

  // If any request discovers the session is dead, send the user to sign in.
  useEffect(() => {
    if (status === "anonymous") clearSessionFlag();
  }, [status]);

  const finish = useCallback(async (result: AuthResult): Promise<User> => {
    useAuthStore.getState().setAccessToken(result.accessToken);
    const u = result.user?.id ? result.user : await authApi.me();
    useAuthStore.setState({ user: u, status: "authenticated", signedOut: false });
    setSessionFlag();
    return u;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    login: async (input) => finish(await authApi.login(input)),
    register: async (input) => finish(await authApi.register(input)),
    logout: async () => {
      try { await authApi.logout(); } finally {
        useAuthStore.getState().clear({ explicit: true });
        clearSessionFlag();
        queryClient.clear();
        router.replace("/login");
      }
    },
    retry: () => restore(),
    completeOAuth: async () => {
      const outcome = await refreshSession();
      if (outcome.kind !== "ok") return false;
      try {
        const me = await authApi.me();
        useAuthStore.setState({ user: me, status: "authenticated", signedOut: false });
        setSessionFlag();
        return true;
      } catch { return false; }
    },
    refreshUser: async () => {
      if (useAuthStore.getState().status !== "authenticated") return;
      try { useAuthStore.setState({ user: await authApi.me() }); } catch { /* keep the cached user */ }
    },
    logoutAll: async () => {
      try { await authApi.logoutAll(); } finally {
        useAuthStore.getState().clear({ explicit: true });
        clearSessionFlag();
        queryClient.clear();
        router.replace("/login");
      }
    },
  }), [user, status, finish, queryClient, router, restore]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
