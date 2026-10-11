import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectList } from "./project-list";
import { can } from "@/lib/rbac";
import type { Project, Role } from "@/types/domain";

let role: Role = "MANAGER";
let query = "";
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => "/organizations/o1/projects", useSearchParams: () => new URLSearchParams(query) }));
vi.mock("@/features/organizations/org-context", () => ({
  useOrg: () => ({ organizationId: "o1", role, membershipId: "m-me", roleLoading: false, can: (p: Parameters<typeof can>[1]) => can(role, p) }),
  Can: ({ permission, children, fallback = null }: { permission: Parameters<typeof can>[1]; children: React.ReactNode; fallback?: React.ReactNode }) => (can(role, permission) ? children : fallback),
}));
const calls: Record<string, unknown>[] = [];
let result: { items: Project[]; meta: { page: number; limit: number; total: number; totalPages: number } } | undefined;
let state = { isLoading: false, isError: false };
vi.mock("./hooks", () => ({
  useProjects: (_o: string, p: Record<string, unknown>) => { calls.push(p); return { data: result, isFetching: false, error: null, refetch: vi.fn(), ...state }; },
  useCreateProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const DAY = 86_400_000;
const day = (n: number) => new Date(Math.floor(Date.now() / DAY) * DAY + n * DAY).toISOString();
const project = (o: Partial<Project>): Project => ({ id: "p", name: "P", slug: "p", description: null, status: "ACTIVE", startDate: null, dueDate: null, createdAt: "2026-01-01T00:00:00Z", updatedAt: "", ...o });
const page = (items: Project[]) => ({ items, meta: { page: 1, limit: 12, total: items.length, totalPages: 1 } });

describe("ProjectList", () => {
  beforeEach(() => { role = "MANAGER"; query = ""; calls.length = 0; replace.mockReset(); state = { isLoading: false, isError: false }; result = page([]); });

  it("shows each project's schedule and flags overdue and due-soon work with text, not colour alone", () => {
    result = page([
      project({ id: "a", name: "Late site", dueDate: day(-3), startDate: day(-30) }),
      project({ id: "b", name: "Soon app", dueDate: day(2) }),
      project({ id: "c", name: "Far API", dueDate: day(40) }),
      project({ id: "d", name: "Done work", status: "COMPLETED", dueDate: day(-10) }),
      project({ id: "e", name: "Undated" }),
    ]);
    render(<ProjectList />);
    expect(screen.getByRole("link", { name: /Late site/ })).toHaveTextContent("3 days overdue");
    expect(screen.getByRole("link", { name: /Soon app/ })).toHaveTextContent("Due in 2 days");
    expect(screen.getByRole("link", { name: /Far API/ })).toHaveTextContent("Due in 40 days");
    expect(screen.getByRole("link", { name: /Done work/ })).not.toHaveTextContent("overdue");
    expect(screen.getByRole("link", { name: /Undated/ })).toHaveTextContent("Created Jan 1, 2026");
    expect(screen.getByRole("link", { name: /Late site/ })).toHaveAttribute("href", "/organizations/o1/projects/a");
  });

  it("reads filter, search, sort and page from the URL and sends them to the API", () => {
    query = "status=ACTIVE&search=site&sort=dueDate%3Aasc&page=2";
    render(<ProjectList />);
    expect(calls.at(-1)).toMatchObject({ page: 2, limit: 12, status: "ACTIVE", search: "site", sortBy: "dueDate", sortOrder: "asc" });
    expect(screen.getByLabelText("Sort projects")).toHaveValue("dueDate:asc");
  });

  it("writes the chosen sort back to the URL and resets the page", async () => {
    query = "page=3";
    render(<ProjectList />);
    await userEvent.selectOptions(screen.getByLabelText("Sort projects"), "dueDate:asc");
    expect(replace).toHaveBeenCalledWith("/organizations/o1/projects?sort=dueDate%3Aasc", { scroll: false });
  });

  it("offers every sort the backend supports (createdAt, name, dueDate)", () => {
    render(<ProjectList />);
    const labels = within(screen.getByLabelText("Sort projects")).getAllByRole("option").map((o) => o.textContent);
    expect(labels).toEqual(["Newest first", "Oldest first", "Name A–Z", "Name Z–A", "Due soonest"]);
  });

  it("distinguishes 'no projects yet' (with a create action for managers) from 'no matches'", () => {
    const { unmount } = render(<ProjectList />);
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New project/ })).toBeInTheDocument();
    unmount();

    query = "search=zzz";
    render(<ProjectList />);
    expect(screen.getByText("No projects match")).toBeInTheDocument();
  });

  it("TEAM_MEMBER gets the empty state without a create button", () => {
    role = "TEAM_MEMBER";
    render(<ProjectList />);
    expect(screen.getByText("No projects yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New project/ })).not.toBeInTheDocument();
  });

  it("shows a retryable error state when loading fails", () => {
    state = { isLoading: false, isError: true }; result = undefined;
    render(<ProjectList />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load projects");
  });
});
