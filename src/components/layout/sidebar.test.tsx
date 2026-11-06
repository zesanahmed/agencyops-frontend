import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let role: "OWNER" | "MANAGER" | "TEAM_MEMBER" | undefined = "OWNER";
let permissions: string[] | undefined;
vi.mock("next/navigation", () => ({ usePathname: () => "/organizations/o1" }));
vi.mock("./org-switcher", () => ({ OrgSwitcher: () => null }));
vi.mock("@/lib/api/services", () => ({ notificationApi: { list: vi.fn().mockResolvedValue({ items: [], meta: { total: 0 } }) } }));
vi.mock("@/features/organizations/hooks", () => ({
  qk: { notifications: () => ["n"] },
  useOrganization: () => ({ isSuccess: true }),
  useOrgMembership: () => ({ role, permissions, membershipId: "m1", isLoading: false }),
}));

import { SidebarNav } from "./sidebar";

const renderNav = () => render(<QueryClientProvider client={new QueryClient()}><SidebarNav organizationId="o1" /></QueryClientProvider>);
const has = (name: string) => screen.queryByRole("link", { name }) !== null;

describe("SidebarNav permission gating (UX only; the server enforces)", () => {
  it("owners and managers see Clients and Invoices", () => {
    for (const r of ["OWNER", "MANAGER"] as const) { role = r; permissions = undefined; const { unmount } = renderNav(); expect(has("Clients")).toBe(true); expect(has("Invoices")).toBe(true); unmount(); }
  });
  it("team members see Clients and Client requests (read-only) but not Invoices", () => {
    role = "TEAM_MEMBER"; permissions = undefined;
    renderNav();
    expect(has("Clients")).toBe(true);
    expect(has("Client requests")).toBe(true);
    expect(has("Invoices")).toBe(false);
    expect(has("Projects")).toBe(true);
  });
  it("the server's permission list wins over the role matrix", () => {
    role = "OWNER"; permissions = ["project:read", "client:read"];
    renderNav();
    expect(has("Clients")).toBe(true);
    expect(has("Client requests")).toBe(false);
    expect(has("Invoices")).toBe(false);
  });
  it("a group with nothing visible disappears", () => {
    role = "TEAM_MEMBER"; permissions = ["project:read"];
    renderNav();
    expect(screen.queryByText("Business")).not.toBeInTheDocument();
  });
});
