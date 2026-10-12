import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SprintPanel } from "./sprint-panel";
import { can } from "@/lib/rbac";
import type { Role, Sprint } from "@/types/domain";

let role: Role = "MANAGER";
vi.mock("@/features/organizations/org-context", () => ({
  useOrg: () => ({ organizationId: "o1", role, can: (p: Parameters<typeof can>[1]) => can(role, p) }),
  Can: ({ permission, children }: { permission: Parameters<typeof can>[1]; children: React.ReactNode }) => (can(role, permission) ? children : null),
}));
let sprints: Sprint[] = [];
vi.mock("@/features/projects/hooks", () => ({ useSprints: () => ({ isLoading: false, isError: false, data: { items: sprints }, refetch: vi.fn() }) }));
const startFn = vi.fn(); const completeFn = vi.fn(); const removeFn = vi.fn();
vi.mock("./hooks", () => ({
  useStartSprint: () => ({ mutate: startFn, isPending: false }),
  useCompleteSprint: () => ({ mutate: completeFn, isPending: false }),
  useDeleteSprint: () => ({ mutateAsync: removeFn, isPending: false }),
  useCreateSprint: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateSprint: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const sp = (o: Partial<Sprint>): Sprint => ({ id: "s", projectId: "p1", name: "S", goal: null, status: "PLANNED", startDate: "2026-01-01T00:00:00.000Z", endDate: "2026-01-14T00:00:00.000Z", ...o });

describe("SprintPanel", () => {
  beforeEach(() => { role = "MANAGER"; startFn.mockReset(); completeFn.mockReset(); removeFn.mockReset(); sprints = []; });

  it("shows an empty state with a create action for roles that can create sprints", () => {
    render(<SprintPanel projectId="p1" />);
    expect(screen.getByText("No sprints yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New sprint/ })).toBeInTheDocument();
  });

  it("shows calendar dates as the stored UTC day and only offers actions that match each status", () => {
    sprints = [sp({ id: "a", name: "Planned one" }), sp({ id: "b", name: "Live one", status: "ACTIVE" }), sp({ id: "c", name: "Old one", status: "COMPLETED" })];
    render(<SprintPanel projectId="p1" />);
    expect(screen.getAllByText("Jan 1, 2026 → Jan 14, 2026")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Planned one" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Complete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Planned one" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Live one" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Old one" })).not.toBeInTheDocument(); // completed sprints are history
    expect(screen.queryByRole("button", { name: "Delete Live one" })).not.toBeInTheDocument(); // backend: only PLANNED can be deleted
  });

  it("starts a planned sprint and opens the edit dialog prefilled", async () => {
    sprints = [sp({ id: "a", name: "Planned one", goal: "Ship it" })];
    render(<SprintPanel projectId="p1" />);
    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(startFn).toHaveBeenCalledWith("a");
    await userEvent.click(screen.getByRole("button", { name: "Edit Planned one" }));
    expect(await screen.findByRole("dialog", { name: "Edit sprint" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Planned one");
  });

  it("confirms before deleting a planned sprint", async () => {
    sprints = [sp({ id: "a", name: "Planned one" })];
    render(<SprintPanel projectId="p1" />);
    await userEvent.click(screen.getByRole("button", { name: "Delete Planned one" }));
    expect(removeFn).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Delete sprint" }));
    expect(removeFn).toHaveBeenCalledWith("a");
  });

  it("TEAM_MEMBER can read sprints but gets no create/edit/start/delete controls", () => {
    role = "TEAM_MEMBER";
    sprints = [sp({ id: "a", name: "Planned one" }), sp({ id: "b", name: "Live one", status: "ACTIVE" })];
    render(<SprintPanel projectId="p1" />);
    expect(screen.getByText("Planned one")).toBeInTheDocument();
    for (const name of [/New sprint/, "Start", "Complete", /^Edit /, /^Delete /]) expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
  });
});
