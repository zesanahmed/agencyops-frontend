"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { authApi, type AuthResult } from "@/lib/api/services";
import { refreshAccessToken } from "@/lib/api/client";
import { clearSessionFlag, hasSessionFlag, setSessionFlag } from "@/lib/auth/session-flag";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types/domain";

interface AuthContextValue {
  user: User | null;
  status: "unknown" | "authenticated" | "anonymous";
  login: (input: { email: string; password: string }) => Promise<User>;
  register: (input: { name: string; email: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, status } = useAuthStore();

  // Restore the session once on load using the HttpOnly refresh cookie.
  useEffect(() => {
    if (useAuthStore.getState().status !== "unknown") return;
    // No session hint => nothing to restore. Skips a pointless /auth/refresh for anonymous visitors.
    if (!hasSessionFlag()) {
      useAuthStore.getState().clear();
      return;
    }
    let cancelled = false;
    (async () => {
      const token = await refreshAccessToken();
      if (cancelled) return;
      if (!token) {
        clearSessionFlag();
        useAuthStore.getState().clear();
        return;
      }
      try {
        const me = await authApi.me();
        if (cancelled) return;
        useAuthStore.setState({ user: me, status: "authenticated" });
        setSessionFlag();
      } catch {
        clearSessionFlag();
        useAuthStore.getState().clear();
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
    logoutAll: async () => {
      try { await authApi.logoutAll(); } finally {
        useAuthStore.getState().clear({ explicit: true });
        clearSessionFlag();
        queryClient.clear();
        router.replace("/login");
      }
    },
  }), [user, status, finish, queryClient, router]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
