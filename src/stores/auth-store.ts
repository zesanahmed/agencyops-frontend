import { create } from "zustand";
import type { User } from "@/types/domain";

/**
 * Access token lives in memory only. The refresh token is an HttpOnly cookie
 * managed by the backend, so nothing sensitive is ever written to storage.
 */
export type AuthStatus = "unknown" | "authenticated" | "anonymous";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  status: AuthStatus;
  /** True after an explicit sign-out, so the gate redirects to plain /login (no return-to). */
  signedOut: boolean;
  setAccessToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setStatus: (status: AuthStatus) => void;
  clear: (opts?: { explicit?: boolean }) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: "unknown",
  signedOut: false,
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  setStatus: (status) => set({ status }),
  clear: (opts) => set({ accessToken: null, user: null, status: "anonymous", signedOut: opts?.explicit === true }),
}));
