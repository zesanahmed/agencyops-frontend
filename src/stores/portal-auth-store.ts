import { create } from "zustand";
import type { PortalContact } from "@/types/domain";
import type { AuthStatus } from "./auth-store";

/** The client portal's own session, kept apart from the staff session: separate tokens, separate refresh cookie. */
interface PortalAuthState {
  accessToken: string | null;
  contact: PortalContact | null;
  status: AuthStatus;
  signedOut: boolean;
  setAccessToken: (token: string | null) => void;
  setContact: (contact: PortalContact | null) => void;
  setStatus: (status: AuthStatus) => void;
  clear: (opts?: { explicit?: boolean }) => void;
}

export const usePortalAuthStore = create<PortalAuthState>((set) => ({
  accessToken: null,
  contact: null,
  status: "unknown",
  signedOut: false,
  setAccessToken: (accessToken) => set({ accessToken }),
  setContact: (contact) => set({ contact }),
  setStatus: (status) => set({ status }),
  clear: (opts) => set({ accessToken: null, contact: null, status: "anonymous", signedOut: opts?.explicit === true }),
}));
