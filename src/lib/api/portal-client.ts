import { usePortalAuthStore } from "@/stores/portal-auth-store";
import { createTransport } from "./client";

/**
 * Transport for /portal/*. Different tokens, a different refresh cookie (agencyops_refresh_token_client) and a different
 * store than the staff API; a staff token is never sent here and a portal token never goes to the staff API.
 */
export const portalTransport = createTransport({
  getToken: () => usePortalAuthStore.getState().accessToken,
  setToken: (t) => usePortalAuthStore.getState().setAccessToken(t),
  onRejected: () => usePortalAuthStore.getState().clear(),
  refreshPath: "/portal/auth/refresh",
});

export const portalApi = portalTransport.api;
export const portalGetRaw = portalTransport.getRaw;
export const portalUpload = portalTransport.upload;
export const refreshPortalSession = portalTransport.refresh;
