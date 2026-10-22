import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectFormDialog } from "./project-form-dialog";
import { ApiError } from "@/lib/api/errors";
import type { Project } from "@/types/domain";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock("@/features/organizations/org-context", () => ({ useOrg: () => ({ organizationId: "o1" }) }));
const createFn = vi.fn(); const updateFn = vi.fn();
vi.mock("./hooks", () => ({
  useCreateProject: () => ({ mutateAsync: createFn, isPending: false }),
  useUpdateProject: () => ({ mutateAsync: updateFn, isPending: false }),
}));

const PROJECT: Project = {
  id: "p1", name: "Website", slug: "website", description: "Refresh", status: "ACTIVE",
  startDate: "2026-01-01T00:00:00.000Z", dueDate: "2026-02-01T00:00:00.000Z", createdAt: "", updatedAt: "",
};

describe("ProjectFormDialog", () => {
  beforeEach(() => { createFn.mockReset(); updateFn.mockReset(); push.mockReset(); });

  it("create: validates the name, then creates and opens the new project", async () => {
    createFn.mockResolvedValue({ ...PROJECT, id: "p9" });
    const onOpenChange = vi.fn();
    render(<ProjectFormDialog mode="create" open onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(createFn).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText("Name"), "Mobile app");
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    await waitFor(() => expect(createFn).toHaveBeenCalledWith({ name: "Mobile app" }));
    expect(push).toHaveBeenCalledWith("/organizations/o1/projects/p9");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("create: sends the schedule as UTC-midnight dates", async () => {
    createFn.mockResolvedValue(PROJECT);
    render(<ProjectFormDialog mode="create" open onOpenChange={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Name"), "Mobile app");
    await userEvent.type(screen.getByLabelText(/Start date/), "2026-03-01");
    await userEvent.type(screen.getByLabelText(/Due date/), "2026-04-01");
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    await waitFor(() => expect(createFn).toHaveBeenCalledWith({ name: "Mobile app", startDate: "2026-03-01T00:00:00.000Z", dueDate: "2026-04-01T00:00:00.000Z" }));
  });

  it("blocks a due date before the start date without calling the API", async () => {
    render(<ProjectFormDialog mode="create" open onOpenChange={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Name"), "X");
    await userEvent.type(screen.getByLabelText(/Start date/), "2026-04-01");
    await userEvent.type(screen.getByLabelText(/Due date/), "2026-03-01");
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    expect(await screen.findByText("Due date must be on or after the start date")).toBeInTheDocument();
    expect(createFn).not.toHaveBeenCalled();
  });

  it("shows a duplicate name (the backend's 409 on the derived slug) on the Name field", async () => {
    createFn.mockRejectedValue(new ApiError(409, "A project with this slug already exists in the organization"));
    const onOpenChange = vi.fn();
    render(<ProjectFormDialog mode="create" open onOpenChange={onOpenChange} />);
    await userEvent.type(screen.getByLabelText("Name"), "Website");
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    expect(await screen.findByText("A project with this name already exists in the organization")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(push).not.toHaveBeenCalled();
  });

  it("maps backend field validation errors onto the matching fields", async () => {
    createFn.mockRejectedValue(new ApiError(400, "Validation failed", undefined, [{ path: "dueDate", message: "dueDate must be on or after startDate" }]));
    render(<ProjectFormDialog mode="create" open onOpenChange={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Name"), "X");
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    expect(await screen.findByText("dueDate must be on or after startDate")).toBeInTheDocument();
  });

  it("edit: is prefilled and clearing the description sends an empty string", async () => {
    updateFn.mockResolvedValue(PROJECT);
    const onOpenChange = vi.fn();
    render(<ProjectFormDialog mode="edit" project={PROJECT} open onOpenChange={onOpenChange} />);
    expect(screen.getByLabelText("Name")).toHaveValue("Website");
    expect(screen.getByLabelText(/Start date/)).toHaveValue("2026-01-01");
    expect(screen.getByLabelText(/Due date/)).toHaveValue("2026-02-01");
    await userEvent.clear(screen.getByLabelText(/Description/));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(updateFn).toHaveBeenCalledWith({ name: "Website", description: "", startDate: "2026-01-01T00:00:00.000Z", dueDate: "2026-02-01T00:00:00.000Z" }));
    expect(createFn).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("edit: emptying a date clears it on the backend (sends null)", async () => {
    updateFn.mockResolvedValue(PROJECT);
    render(<ProjectFormDialog mode="edit" project={PROJECT} open onOpenChange={vi.fn()} />);
    await userEvent.clear(screen.getByLabelText(/Due date/));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ dueDate: null, startDate: "2026-01-01T00:00:00.000Z" })));
  });
});
