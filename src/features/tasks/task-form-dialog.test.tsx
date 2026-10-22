import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskFormDialog } from "./task-form-dialog";
import { ApiError } from "@/lib/api/errors";
import type { Sprint, Task } from "@/types/domain";

vi.mock("@/features/organizations/org-context", () => ({ useOrg: () => ({ organizationId: "o1" }) }));
vi.mock("@/features/members/use-member-directory", () => ({ useMemberDirectory: () => ({ list: [{ id: "m1", name: "Ann" }, { id: "m2", name: "Ben" }] }) }));
const sprint = (o: Partial<Sprint>): Sprint => ({ id: "s", projectId: "p1", name: "S", goal: null, status: "PLANNED", startDate: "", endDate: "", ...o });
let sprints: Sprint[] = [];
vi.mock("@/features/projects/hooks", () => ({ useSprints: () => ({ data: { items: sprints } }) }));
const createFn = vi.fn(); const updateFn = vi.fn();
vi.mock("./hooks", () => ({
  useCreateTask: () => ({ mutateAsync: createFn, isPending: false }),
  useUpdateTask: () => ({ mutateAsync: updateFn, isPending: false }),
}));
const TASK: Task = { id: "t1", projectId: "p1", sprintId: "s-done", parentTaskId: null, assigneeMembershipId: "m1", title: "Login", description: "Old", status: "TODO", priority: "HIGH", startDate: "2026-01-01T00:00:00.000Z", dueDate: "2026-01-10T00:00:00.000Z", createdAt: "" };

describe("TaskFormDialog", () => {
  beforeEach(() => { createFn.mockReset(); updateFn.mockReset(); sprints = [sprint({ id: "s1", name: "Sprint 1" }), sprint({ id: "s2", name: "Sprint 2", status: "ACTIVE" }), sprint({ id: "s-done", name: "Sprint 0", status: "COMPLETED" })]; });

  it("create: validates the title, then sends only what was filled in", async () => {
    createFn.mockResolvedValue(TASK);
    const onOpenChange = vi.fn();
    render(<TaskFormDialog mode="create" projectId="p1" open onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));
    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(createFn).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Title"), "Build login");
    await userEvent.selectOptions(screen.getByLabelText("Priority"), "URGENT");
    await userEvent.selectOptions(screen.getByLabelText("Assignee"), "m2");
    await userEvent.selectOptions(screen.getByLabelText("Sprint"), "s2");
    await userEvent.type(screen.getByLabelText(/Due date/), "2026-03-05");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));
    await waitFor(() => expect(createFn).toHaveBeenCalledWith({ title: "Build login", priority: "URGENT", assigneeMembershipId: "m2", sprintId: "s2", dueDate: "2026-03-05T00:00:00.000Z" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not offer completed sprints for new work", () => {
    render(<TaskFormDialog mode="create" projectId="p1" open onOpenChange={vi.fn()} />);
    const options = within(screen.getByLabelText("Sprint")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["No sprint (backlog)", "Sprint 1", "Sprint 2 (active)"]);
  });

  it("blocks a due date before the start date", async () => {
    render(<TaskFormDialog mode="create" projectId="p1" open onOpenChange={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Title"), "X");
    await userEvent.type(screen.getByLabelText(/Start date/), "2026-03-05");
    await userEvent.type(screen.getByLabelText(/Due date/), "2026-03-01");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));
    expect(await screen.findByText("Due date must be on or after the start date")).toBeInTheDocument();
    expect(createFn).not.toHaveBeenCalled();
  });

  it("maps backend field errors onto the form and keeps the dialog open", async () => {
    createFn.mockRejectedValue(new ApiError(404, "Sprint not found in this project"));
    createFn.mockRejectedValueOnce(new ApiError(400, "Validation failed", undefined, [{ path: "title", message: "Title is too long for the server" }]));
    const onOpenChange = vi.fn();
    render(<TaskFormDialog mode="create" projectId="p1" open onOpenChange={onOpenChange} />);
    await userEvent.type(screen.getByLabelText("Title"), "X");
    await userEvent.click(screen.getByRole("button", { name: "Create task" }));
    expect(await screen.findByText("Title is too long for the server")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("edit: is prefilled, keeps the task's current (even completed) sprint selectable, and clearing fields sends null", async () => {
    updateFn.mockResolvedValue(TASK);
    render(<TaskFormDialog mode="edit" projectId="p1" task={TASK} open onOpenChange={vi.fn()} />);
    expect(screen.getByLabelText("Title")).toHaveValue("Login");
    expect(screen.getByLabelText("Sprint")).toHaveValue("s-done");
    expect(screen.getByLabelText("Assignee")).toHaveValue("m1");
    expect(screen.getByLabelText(/Due date/)).toHaveValue("2026-01-10");
    await userEvent.selectOptions(screen.getByLabelText("Sprint"), "");
    await userEvent.selectOptions(screen.getByLabelText("Assignee"), "");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(updateFn).toHaveBeenCalledWith({
      title: "Login", priority: "HIGH", description: "Old", assigneeMembershipId: null, sprintId: null,
      startDate: "2026-01-01T00:00:00.000Z", dueDate: "2026-01-10T00:00:00.000Z",
    }));
    expect(createFn).not.toHaveBeenCalled();
  });

  it("edit: emptying a date clears it on the backend (sends null)", async () => {
    updateFn.mockResolvedValue(TASK);
    render(<TaskFormDialog mode="edit" projectId="p1" task={TASK} open onOpenChange={vi.fn()} />);
    await userEvent.clear(screen.getByLabelText(/Start date/));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ startDate: null })));
  });
});
