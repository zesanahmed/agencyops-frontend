import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskDetail } from "./task-detail";
import { can } from "@/lib/rbac";
import type { Role, Sprint, Task } from "@/types/domain";

let role: Role = "MANAGER";
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => "/x", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/organizations/org-context", () => ({
  useOrg: () => ({ organizationId: "o1", role, membershipId: "m-me", can: (p: Parameters<typeof can>[1]) => can(role, p) }),
  Can: ({ permission, children }: { permission: Parameters<typeof can>[1]; children: React.ReactNode }) => (can(role, permission) ? children : null),
}));
vi.mock("@/features/members/use-member-directory", () => ({ useMemberDirectory: () => ({ list: [{ id: "m1", name: "Ann" }, { id: "m2", name: "Ben" }], nameOf: () => "Ann" }) }));
const DAY = 86_400_000;
const day = (n: number) => new Date(Math.floor(Date.now() / DAY) * DAY + n * DAY).toISOString();
let task: Task;
let taskState = { isLoading: false, isError: false };
const sprints: Sprint[] = [
  { id: "s1", projectId: "p1", name: "Sprint 1", goal: null, status: "PLANNED", startDate: "", endDate: "" },
  { id: "s2", projectId: "p1", name: "Sprint 2", goal: null, status: "ACTIVE", startDate: "", endDate: "" },
  { id: "s0", projectId: "p1", name: "Sprint 0", goal: null, status: "COMPLETED", startDate: "", endDate: "" },
];
vi.mock("@/features/projects/hooks", () => ({
  useTask: () => ({ data: taskState.isError ? undefined : task, error: null, refetch: vi.fn(), ...taskState }),
  useSprints: () => ({ data: { items: sprints } }),
}));
const updateMutate = vi.fn(); const deleteFn = vi.fn();
vi.mock("./hooks", () => ({
  useUpdateTask: () => ({ mutate: updateMutate, mutateAsync: vi.fn(), isPending: false }),
  useDeleteTask: () => ({ mutateAsync: deleteFn }),
  useCreateTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("./task-subtasks", () => ({ TaskSubtasks: () => <div>SUBTASKS</div> }));
vi.mock("./task-comments", () => ({ TaskComments: () => <div>COMMENTS</div> }));
vi.mock("./task-collaborators", () => ({ TaskCollaborators: () => <div>COLLABORATORS</div> }));

const base = (o: Partial<Task> = {}): Task => ({ id: "t1", projectId: "p1", sprintId: "s2", parentTaskId: null, assigneeMembershipId: "m1", title: "Build login", description: "OAuth later", status: "IN_PROGRESS", priority: "HIGH", startDate: "2026-01-01T00:00:00.000Z", dueDate: day(-2), createdAt: "", ...o });

describe("TaskDetail", () => {
  beforeEach(() => { role = "MANAGER"; task = base(); taskState = { isLoading: false, isError: false }; updateMutate.mockReset(); deleteFn.mockReset(); replace.mockReset(); });

  it("shows the task's identity, schedule and the three working sections", () => {
    render(<TaskDetail projectId="p1" taskId="t1" />);
    expect(screen.getByRole("heading", { name: "Build login" })).toBeInTheDocument();
    expect(screen.getByText("OAuth later")).toBeInTheDocument();
    expect(screen.getByText("2 days overdue")).toBeInTheDocument();
    for (const s of ["SUBTASKS", "COMMENTS", "COLLABORATORS"]) expect(screen.getByText(s)).toBeInTheDocument();
    const aside = screen.getByRole("complementary", { name: "Task details" });
    expect(within(aside).getByText("Jan 1, 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to project/ })).toHaveAttribute("href", "/organizations/o1/projects/p1");
  });

  it("does not flag a finished task as overdue", () => {
    task = base({ status: "DONE" });
    render(<TaskDetail projectId="p1" taskId="t1" />);
    expect(screen.queryByText(/overdue/)).not.toBeInTheDocument();
  });

  it("quick-edits status, priority, assignee and sprint, sending null to clear", async () => {
    render(<TaskDetail projectId="p1" taskId="t1" />);
    await userEvent.selectOptions(screen.getByLabelText("Status"), "DONE");
    await userEvent.selectOptions(screen.getByLabelText("Priority"), "URGENT");
    await userEvent.selectOptions(screen.getByLabelText("Assignee"), "");
    await userEvent.selectOptions(screen.getByLabelText("Sprint"), "");
    expect(updateMutate.mock.calls).toEqual([[{ status: "DONE" }], [{ priority: "URGENT" }], [{ assigneeMembershipId: null }], [{ sprintId: null }]]);
  });

  it("offers planned and active sprints, plus the task's own sprint even if it is completed", () => {
    const names = (el: HTMLElement) => within(el).getAllByRole("option").map((o) => o.textContent);
    const { unmount } = render(<TaskDetail projectId="p1" taskId="t1" />);
    expect(names(screen.getByLabelText("Sprint"))).toEqual(["No sprint (backlog)", "Sprint 1", "Sprint 2 (active)"]);
    unmount();
    task = base({ sprintId: "s0" });
    render(<TaskDetail projectId="p1" taskId="t1" />);
    expect(names(screen.getByLabelText("Sprint"))).toEqual(["No sprint (backlog)", "Sprint 1", "Sprint 2 (active)", "Sprint 0"]);
  });

  it("opens the edit dialog prefilled", async () => {
    render(<TaskDetail projectId="p1" taskId="t1" />);
    await userEvent.click(screen.getByRole("button", { name: "Edit task" }));
    expect(await screen.findByRole("dialog", { name: "Edit task" })).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Build login");
  });

  it("asks before deleting, then returns to the project", async () => {
    deleteFn.mockResolvedValue(undefined);
    render(<TaskDetail projectId="p1" taskId="t1" />);
    await userEvent.click(screen.getByRole("button", { name: "Delete task" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete this task?" });
    expect(deleteFn).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete task" }));
    expect(deleteFn).toHaveBeenCalledWith("t1");
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/organizations/o1/projects/p1"));
  });

  it("TEAM_MEMBER can update a task (backend task:update) but cannot delete it", () => {
    role = "TEAM_MEMBER";
    render(<TaskDetail projectId="p1" taskId="t1" />);
    expect(screen.getByLabelText("Status")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Edit task" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete task" })).not.toBeInTheDocument();
  });

  it("shows a retryable error when the task can't be loaded", () => {
    taskState = { isLoading: false, isError: true };
    render(<TaskDetail projectId="p1" taskId="t1" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load this task");
  });
});
