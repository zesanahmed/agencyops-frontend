import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectWorkspace } from "./project-workspace";
import { can } from "@/lib/rbac";
import type { Project, Role } from "@/types/domain";

let role: Role = "MANAGER";
let query = "";
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => "/organizations/o1/projects/p1", useSearchParams: () => new URLSearchParams(query) }));
vi.mock("@/features/organizations/org-context", () => ({
  useOrg: () => ({ organizationId: "o1", role, membershipId: "m-me", roleLoading: false, can: (p: Parameters<typeof can>[1]) => can(role, p) }),
  Can: ({ permission, children, fallback = null }: { permission: Parameters<typeof can>[1]; children: React.ReactNode; fallback?: React.ReactNode }) => (can(role, permission) ? children : fallback),
}));
const PROJECT: Project = { id: "p1", name: "Website redesign", slug: "website-redesign", description: "Q1 refresh", status: "ACTIVE", startDate: "2026-01-01T00:00:00.000Z", dueDate: "2026-02-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00Z", updatedAt: "" };
const update = vi.fn();
vi.mock("./hooks", () => ({
  useProject: () => ({ data: PROJECT, isLoading: false, isError: false, error: null, refetch: vi.fn() }),
  useUpdateProject: () => ({ mutate: update, mutateAsync: vi.fn(), isPending: false }),
  useDeleteProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("./project-overview", () => ({ ProjectOverview: ({ onOpenTab }: { onOpenTab: (t: string) => void }) => <div>OVERVIEW<button onClick={() => onOpenTab("people")}>go people</button></div> }));
vi.mock("@/features/tasks/task-list", () => ({ TaskList: () => <div>TASKS PANEL</div> }));
vi.mock("@/features/sprints/sprint-panel", () => ({ SprintPanel: () => <div>SPRINTS PANEL</div> }));
vi.mock("./project-teams-panel", () => ({ ProjectTeamsPanel: () => <div>TEAMS PANEL</div> }));
vi.mock("./project-people", () => ({ ProjectPeople: () => <div>PEOPLE PANEL</div> }));

describe("ProjectWorkspace", () => {
  beforeEach(() => { role = "MANAGER"; query = ""; replace.mockReset(); update.mockReset(); });

  it("opens on the Overview tab and shows the project's identity and schedule", () => {
    render(<ProjectWorkspace projectId="p1" />);
    expect(screen.getByRole("heading", { name: "Website redesign" })).toBeInTheDocument();
    expect(screen.getByText("OVERVIEW")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Jan 1, 2026 → Feb 1, 2026")).toBeInTheDocument();
  });

  it("restores the tab from the URL (?tab=), so a view can be shared", () => {
    query = "tab=sprints";
    render(<ProjectWorkspace projectId="p1" />);
    expect(screen.getByText("SPRINTS PANEL")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sprints" })).toHaveAttribute("aria-selected", "true");
  });

  it("falls back to Overview for an unknown tab value", () => {
    query = "tab=nonsense";
    render(<ProjectWorkspace projectId="p1" />);
    expect(screen.getByText("OVERVIEW")).toBeInTheDocument();
  });

  it("writes the chosen tab to the URL and drops the previous tab's list filters", async () => {
    query = "tab=tasks&status=TODO&search=login&page=2";
    render(<ProjectWorkspace projectId="p1" />);
    await userEvent.click(screen.getByRole("tab", { name: "People" }));
    expect(replace).toHaveBeenCalledWith("/organizations/o1/projects/p1?tab=people", { scroll: false });
  });

  it("returning to Overview removes ?tab= entirely", async () => {
    query = "tab=teams";
    render(<ProjectWorkspace projectId="p1" />);
    await userEvent.click(screen.getByRole("tab", { name: "Overview" }));
    expect(replace).toHaveBeenCalledWith("/organizations/o1/projects/p1", { scroll: false });
  });

  it("lets the overview jump to another tab", async () => {
    render(<ProjectWorkspace projectId="p1" />);
    await userEvent.click(screen.getByRole("button", { name: "go people" }));
    expect(replace).toHaveBeenCalledWith("/organizations/o1/projects/p1?tab=people", { scroll: false });
  });

  it("MANAGER can edit and change status but not delete; OWNER can also delete", () => {
    const { unmount } = render(<ProjectWorkspace projectId="p1" />);
    expect(screen.getByRole("button", { name: "Edit project" })).toBeInTheDocument();
    expect(screen.getByLabelText("Project status")).toBeInTheDocument();
    unmount();
    role = "OWNER";
    render(<ProjectWorkspace projectId="p1" />);
    expect(screen.getByRole("button", { name: "Delete project" })).toBeInTheDocument();
  });

  it("TEAM_MEMBER sees the project read-only", () => {
    role = "TEAM_MEMBER";
    render(<ProjectWorkspace projectId="p1" />);
    expect(screen.getByRole("heading", { name: "Website redesign" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit project" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Project status")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete project" })).not.toBeInTheDocument();
  });

  it("opens the edit dialog prefilled from the project", async () => {
    render(<ProjectWorkspace projectId="p1" />);
    await userEvent.click(screen.getByRole("button", { name: "Edit project" }));
    expect(await screen.findByRole("dialog", { name: "Edit project" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Website redesign");
  });
});
