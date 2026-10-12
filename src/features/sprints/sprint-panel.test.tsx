import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SprintPanel } from "./sprint-panel";
import { can } from "@/lib/rbac";
import type { Role, Sprint, Task } from "@/types/domain";

let role: Role = "MANAGER";
vi.mock("@/features/organizations/org-context", () => ({
  useOrg: () => ({ organizationId: "o1", role, can: (p: Parameters<typeof can>[1]) => can(role, p) }),
  Can: ({ permission, children }: { permission: Parameters<typeof can>[1]; children: React.ReactNode }) => (can(role, permission) ? children : null),
}));
let sprints: Sprint[] = [];
let tasks: Task[] = [];
let totalTasks: number | undefined;
vi.mock("@/features/projects/hooks", () => ({
  useSprints: () => ({ isLoading: false, isError: false, data: { items: sprints }, refetch: vi.fn() }),
  useTasks: () => ({ isLoading: false, data: { items: tasks, meta: { total: totalTasks ?? tasks.length } } }),
}));
const startFn = vi.fn(); const completeFn = vi.fn(); const removeFn = vi.fn();
vi.mock("./hooks", () => ({
  useStartSprint: () => ({ mutate: startFn, isPending: false }),
  useCompleteSprint: () => ({ mutateAsync: completeFn, isPending: false }),
  useDeleteSprint: () => ({ mutateAsync: removeFn, isPending: false }),
  useCreateSprint: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateSprint: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const tk = (o: Partial<Task>): Task => ({ id: "t", projectId: "p1", sprintId: null, parentTaskId: null, assigneeMembershipId: null, title: "T", description: null, status: "TODO", priority: "MEDIUM", startDate: null, dueDate: null, createdAt: "", ...o });
const sp = (o: Partial<Sprint>): Sprint => ({ id: "s", projectId: "p1", name: "S", goal: null, status: "PLANNED", startDate: "2026-01-01T00:00:00.000Z", endDate: "2026-01-14T00:00:00.000Z", ...o });

describe("SprintPanel", () => {
  beforeEach(() => { role = "MANAGER"; startFn.mockReset(); completeFn.mockReset(); removeFn.mockReset(); sprints = []; tasks = []; totalTasks = undefined; });

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

  it("lists the active sprint first, then planned, then completed", () => {
    sprints = [sp({ id: "c", name: "Done one", status: "COMPLETED" }), sp({ id: "p", name: "Planned one" }), sp({ id: "a", name: "Live one", status: "ACTIVE" })];
    render(<SprintPanel projectId="p1" />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Live one", "Planned one", "Done one"]);
  });

  it("shows each sprint's own task completion and links to its filtered task list", () => {
    sprints = [sp({ id: "a", name: "Live one", status: "ACTIVE" }), sp({ id: "b", name: "Empty one" })];
    tasks = [tk({ id: "1", sprintId: "a", status: "DONE" }), tk({ id: "2", sprintId: "a" }), tk({ id: "3", sprintId: "a" }), tk({ id: "4", sprintId: "other", status: "DONE" })];
    render(<SprintPanel projectId="p1" />);
    const live = screen.getByRole("heading", { name: "Live one" }).closest("li") as HTMLElement;
    expect(within(live).getByRole("progressbar", { name: "Live one tasks done" })).toHaveAttribute("aria-valuenow", "33");
    expect(live).toHaveTextContent("1 of 3 tasks done");
    expect(within(live).getByRole("link", { name: "View tasks" })).toHaveAttribute("href", "/organizations/o1/projects/p1?tab=tasks&sprint=a");
    const empty = screen.getByRole("heading", { name: "Empty one" }).closest("li") as HTMLElement;
    expect(empty).toHaveTextContent("No tasks in this sprint yet");
    expect(within(empty).queryByRole("link", { name: "View tasks" })).not.toBeInTheDocument();
  });

  it("says when task counts cover only part of a large project", () => {
    sprints = [sp({ id: "a" })];
    tasks = [tk({ id: "1" })]; totalTasks = 300;
    render(<SprintPanel projectId="p1" />);
    expect(screen.getByText(/most recent tasks of 300/)).toBeInTheDocument();
  });

  it("asks before completing, and warns how many tasks are still open", async () => {
    sprints = [sp({ id: "a", name: "Live one", status: "ACTIVE" })];
    tasks = [tk({ id: "1", sprintId: "a", status: "DONE" }), tk({ id: "2", sprintId: "a" }), tk({ id: "3", sprintId: "a" })];
    render(<SprintPanel projectId="p1" />);
    await userEvent.click(screen.getByRole("button", { name: "Complete" }));
    expect(completeFn).not.toHaveBeenCalled();
    expect(await screen.findByText(/2 of 3 tasks are not done/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Complete sprint" }));
    expect(completeFn).toHaveBeenCalledWith("a");
  });

  it("completing a fully finished sprint shows no open-task warning", async () => {
    sprints = [sp({ id: "a", name: "Live one", status: "ACTIVE" })];
    tasks = [tk({ id: "1", sprintId: "a", status: "DONE" })];
    render(<SprintPanel projectId="p1" />);
    await userEvent.click(screen.getByRole("button", { name: "Complete" }));
    expect(await screen.findByText("A completed sprint can't be reopened.")).toBeInTheDocument();
    expect(screen.queryByText(/not done/)).not.toBeInTheDocument();
  });
});
