import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MembersView } from "./members-view";
import { can } from "@/lib/rbac";
import { useAuthStore } from "@/stores/auth-store";
import type { Membership, Role } from "@/types/domain";

let role: Role = "OWNER";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }), usePathname: () => "/x", useSearchParams: () => new URLSearchParams() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/features/organizations/org-context", () => ({
  useOrg: () => ({ organizationId: "o1", role, membershipId: "m-me", roleLoading: false, can: (p: Parameters<typeof can>[1]) => can(role, p) }),
  Can: ({ permission, children, fallback = null }: { permission: Parameters<typeof can>[1]; children: React.ReactNode; fallback?: React.ReactNode }) => (can(role, permission) ? children : fallback),
}));

const member = (id: string, userId: string, name: string, r: Role): Membership => ({ id, userId, organizationId: "o1", role: r, status: "ACTIVE", joinedAt: "2026-01-01T00:00:00Z", name, email: `${name.toLowerCase()}@x.io`, avatarUrl: null });
const MEMBERS = [member("m-owner", "u-owner", "Olivia", "OWNER"), member("m-mgr", "u-mgr", "Bob", "MANAGER"), member("m-tm", "u-tm", "Cy", "TEAM_MEMBER")];
const meta = { page: 1, limit: 20, total: 3, totalPages: 1 };
const INVITATIONS = [
  { id: "i1", email: "pending@x.io", role: "TEAM_MEMBER", invitedByMembershipId: "m-owner", expiresAt: "2099-01-01T00:00:00Z", acceptedAt: null, revokedAt: null, createdAt: "2026-01-01T00:00:00Z" },
  { id: "i2", email: "done@x.io", role: "MANAGER", invitedByMembershipId: "m-owner", expiresAt: "2099-01-01T00:00:00Z", acceptedAt: "2026-01-02T00:00:00Z", revokedAt: null, createdAt: "2026-01-01T00:00:00Z" },
] as const;

const memberList = vi.fn();
const invitationList = vi.fn();
vi.mock("@/lib/api/services", () => ({
  memberApi: { list: (...a: unknown[]) => memberList(...a), updateRole: vi.fn(), remove: vi.fn() },
  invitationApi: { list: (...a: unknown[]) => invitationList(...a), create: vi.fn(), revoke: vi.fn() },
}));

function renderAs(r: Role, userId: string) {
  role = r;
  useAuthStore.setState({ user: { id: userId, name: "me", email: "me@x.io", avatarUrl: null }, status: "authenticated" });
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MembersView /></QueryClientProvider>);
}

describe("MembersView is role-aware (backend matrix)", () => {
  beforeEach(() => {
    memberList.mockResolvedValue({ items: MEMBERS, meta });
    invitationList.mockResolvedValue({ items: INVITATIONS, meta: { ...meta, total: 2 } });
  });

  it("OWNER: can change roles and remove others, but never the owner row or themselves", async () => {
    renderAs("OWNER", "u-owner");
    await screen.findByText("Bob");
    expect(screen.getByLabelText("Role for Bob")).toBeInTheDocument();
    expect(screen.getByLabelText("Role for Cy")).toBeInTheDocument();
    expect(screen.queryByLabelText("Role for Olivia")).not.toBeInTheDocument(); // OWNER role is fixed
    expect(screen.getByRole("button", { name: "Remove Bob" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Olivia" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Invitations" })).toBeInTheDocument();
  });

  it("OWNER: the role selector offers only Manager and Team member (OWNER is not assignable)", async () => {
    renderAs("OWNER", "u-owner");
    const select = await screen.findByLabelText("Role for Cy");
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(["Manager", "Team member"]);
  });

  it("MANAGER: sees roles as read-only badges, no remove buttons, but can reach Invitations", async () => {
    renderAs("MANAGER", "u-mgr");
    await screen.findByText("Cy");
    expect(screen.queryByLabelText(/Role for/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Only an owner can change roles or remove members/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Invitations" })).toBeInTheDocument();
  });

  it("TEAM_MEMBER: read-only list and no Invitations tab at all", async () => {
    renderAs("TEAM_MEMBER", "u-tm");
    await screen.findByText("Olivia");
    expect(screen.queryByLabelText(/Role for/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Invitations" })).not.toBeInTheDocument();
    expect(invitationList).not.toHaveBeenCalled(); // team members lack invitation:read, so don't even ask
  });

  it("marks the signed-in user as (you)", async () => {
    renderAs("OWNER", "u-owner");
    expect(await screen.findByText("(you)")).toBeInTheDocument();
  });
});

describe("Invitations tab", () => {
  beforeEach(() => {
    memberList.mockResolvedValue({ items: MEMBERS, meta });
    invitationList.mockResolvedValue({ items: INVITATIONS, meta: { ...meta, total: 2 } });
  });

  it("shows derived status and offers revoke only for pending invitations", async () => {
    renderAs("OWNER", "u-owner");
    await userEvent.click(await screen.findByRole("tab", { name: "Invitations" }));
    expect(await screen.findByText("pending@x.io")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoke invitation for pending@x.io" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revoke invitation for done@x.io" })).not.toBeInTheDocument();
  });

  it("MANAGER can invite; the dialog never offers OWNER", async () => {
    renderAs("MANAGER", "u-mgr");
    await userEvent.click(await screen.findByRole("tab", { name: "Invitations" }));
    await userEvent.click(await screen.findByRole("button", { name: /Invite someone/ }));
    const role = await screen.findByLabelText("Role");
    expect(within(role).getAllByRole("option").map((o) => o.textContent)).toEqual(["Manager", "Team member"]);
  });
});
