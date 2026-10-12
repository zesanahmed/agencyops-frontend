import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskSubtasks } from "./task-subtasks";
import { can } from "@/lib/rbac";
import type { Role, Task } from "@/types/domain";

let role: Role = "MANAGER";
vi.mock("@/features/organizations/org-context", () => ({ useOrg: () => ({ organizationId: "o1", role, can: (p: Parameters<typeof can>[1]) => can(role, p) }) }));
let subs: Task[] = [];
let q = { isLoading: false, isError: false };
const createFn = vi.fn(); const updateMutate = vi.fn(); const removeMutate = vi.fn();
vi.mock("./hooks", () => ({
  useSubtasks: () => ({ data: q.isError ? undefined : subs, error: null, refetch: vi.fn(), ...q }),
  useCreateSubtask: () => ({ mutateAsync: createFn, isPending: false }),
  useUpdateSubtask: () => ({ mutate: updateMutate, isPending: false }),
  useDeleteSubtask: () => ({ mutate: removeMutate }),
}));
const sub = (o: Partial<Task>): Task => ({ id: "s", projectId: "p1", sprintId: null, parentTaskId: "t1", assigneeMembershipId: null, title: "Sub", description: null, status: "TODO", priority: "MEDIUM", startDate: null, dueDate: null, createdAt: "", ...o });

describe("TaskSubtasks", () => {
  beforeEach(() => { role = "MANAGER"; subs = []; q = { isLoading: false, isError: false }; createFn.mockReset(); updateMutate.mockReset(); removeMutate.mockReset(); });

  it("shows progress through the subtasks", () => {
    subs = [sub({ id: "a", title: "Design", status: "DONE" }), sub({ id: "b", title: "Build" }), sub({ id: "c", title: "Test", status: "IN_PROGRESS" })];
    render(<TaskSubtasks projectId="p1" taskId="t1" />);
    expect(screen.getByText("1 of 3 done")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Subtasks done" })).toHaveAttribute("aria-valuenow", "33");
    expect(screen.getByRole("checkbox", { name: "Mark “Design” not done" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Mark “Build” done" })).not.toBeChecked();
  });

  it("ticking marks a subtask DONE, unticking reopens it as TODO", async () => {
    subs = [sub({ id: "a", title: "Design", status: "DONE" }), sub({ id: "b", title: "Build" })];
    render(<TaskSubtasks projectId="p1" taskId="t1" />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Mark “Build” done" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Mark “Design” not done" }));
    expect(updateMutate.mock.calls).toEqual([[{ id: "b", status: "DONE" }], [{ id: "a", status: "TODO" }]]);
  });

  it("adds a subtask after validating the title, and clears the field", async () => {
    createFn.mockResolvedValue(sub({}));
    render(<TaskSubtasks projectId="p1" taskId="t1" />);
    await userEvent.click(screen.getByRole("button", { name: /Add/ }));
    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(createFn).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("New subtask title"), "Write tests");
    await userEvent.click(screen.getByRole("button", { name: /Add/ }));
    await vi.waitFor(() => expect(createFn).toHaveBeenCalledWith("Write tests"));
    await vi.waitFor(() => expect(screen.getByLabelText("New subtask title")).toHaveValue(""));
  });

  it("deleting a subtask is for managers/owners only", async () => {
    subs = [sub({ id: "a", title: "Design" })];
    const { unmount } = render(<TaskSubtasks projectId="p1" taskId="t1" />);
    await userEvent.click(screen.getByRole("button", { name: "Delete subtask “Design”" }));
    expect(removeMutate).toHaveBeenCalledWith("a");
    unmount();
    role = "TEAM_MEMBER";
    render(<TaskSubtasks projectId="p1" taskId="t1" />);
    expect(screen.queryByRole("button", { name: /Delete subtask/ })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Mark/ })).toBeEnabled(); // TEAM_MEMBER may update tasks
    expect(screen.getByLabelText("New subtask title")).toBeInTheDocument(); // and create them
  });

  it("explains the empty state and handles load errors", () => {
    const { unmount } = render(<TaskSubtasks projectId="p1" taskId="t1" />);
    expect(screen.getByText(/No subtasks/)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    unmount();
    q = { isLoading: false, isError: true };
    render(<TaskSubtasks projectId="p1" taskId="t1" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load subtasks");
  });
});
