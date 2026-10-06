"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { can as canDo, type Permission } from "@/lib/rbac";
import { useOrgStore } from "@/stores/org-store";
import type { Role } from "@/types/domain";
import { useOrgMembership } from "./hooks";

interface OrgContextValue {
  organizationId: string;
  role: Role | undefined;
  /** The caller's own membershipId in this organization (used to match assignees/authors). */
  membershipId: string | undefined;
  roleLoading: boolean;
  can: (permission: Permission) => boolean;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ organizationId, children }: { organizationId: string; children: React.ReactNode }) {
  const { role, membershipId, isLoading } = useOrgMembership(organizationId);
  const setLast = useOrgStore((s) => s.setLast);
  useEffect(() => setLast(organizationId), [organizationId, setLast]);

  const value = useMemo<OrgContextValue>(
    () => ({ organizationId, role, membershipId, roleLoading: isLoading, can: (p) => canDo(role, p) }),
    [organizationId, role, membershipId, isLoading],
  );
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used inside an organization route");
  return ctx;
}

/** Renders children only when the current role has the permission (UX gate; the backend still enforces). */
export function Can({ permission, children, fallback = null }: { permission: Permission; children: React.ReactNode; fallback?: React.ReactNode }) {
  const { can } = useOrg();
  return <>{can(permission) ? children : fallback}</>;
}
