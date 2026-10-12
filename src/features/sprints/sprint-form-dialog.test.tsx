import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SprintFormDialog } from "./sprint-form-dialog";
import { ApiError } from "@/lib/api/errors";
import type { Sprint } from "@/types/domain";

vi.mock("@/features/organizations/org-context", () => ({ useOrg: () => ({ organizationId: "o1" }) }));
const createFn = vi.fn(); const updateFn = vi.fn();
vi.mock("./hooks", () => ({
  useCreateSprint: () => ({ mutateAsync: createFn, isPending: false }),
  useUpdateSprint: () => ({ mutateAsync: updateFn, isPending: false }),
}));
const SPRINT: Sprint = { id: "s1", projectId: "p1", name: "Sprint 1", goal: "Ship login", status: "PLANNED", startDate: "2026-01-01T00:00:00.000Z", endDate: "2026-01-14T00:00:00.000Z" };

describe("SprintFormDialog", () => {
  beforeEach(() => { createFn.mockReset(); updateFn.mockReset(); });

  it("create: requires a name and dates, then sends UTC-midnight dates", async () => {
    createFn.mockResolvedValue(SPRINT);
    const onOpenChange = vi.fn();
    render(<SprintFormDialog mode="create" projectId="p1" open onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Create sprint" }));
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Choose a start date")).toBeInTheDocument();
    expect(createFn).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText("Name"), "Sprint 2");
    await userEvent.type(screen.getByLabelText("Start"), "2026-02-01");
    await userEvent.type(screen.getByLabelText("End"), "2026-02-14");
    await userEvent.click(screen.getByRole("button", { name: "Create sprint" }));
    await waitFor(() => expect(createFn).toHaveBeenCalledWith({ name: "Sprint 2", startDate: "2026-02-01T00:00:00.000Z", endDate: "2026-02-14T00:00:00.000Z" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("rejects an end date before the start date client-side", async () => {
    render(<SprintFormDialog mode="create" projectId="p1" open onOpenChange={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Name"), "S");
    await userEvent.type(screen.getByLabelText("Start"), "2026-02-14");
    await userEvent.type(screen.getByLabelText("End"), "2026-02-01");
    await userEvent.click(screen.getByRole("button", { name: "Create sprint" }));
    expect(await screen.findByText("End date must be on or after the start date")).toBeInTheDocument();
    expect(createFn).not.toHaveBeenCalled();
  });

  it("edit: is prefilled and saves via update, never create", async () => {
    updateFn.mockResolvedValue(SPRINT);
    const onOpenChange = vi.fn();
    render(<SprintFormDialog mode="edit" projectId="p1" sprint={SPRINT} open onOpenChange={onOpenChange} />);
    expect(screen.getByLabelText("Name")).toHaveValue("Sprint 1");
    expect(screen.getByLabelText(/Goal/)).toHaveValue("Ship login");
    expect(screen.getByLabelText("Start")).toHaveValue("2026-01-01");
    await userEvent.clear(screen.getByLabelText(/Goal/));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(updateFn).toHaveBeenCalledWith({ name: "Sprint 1", goal: "", startDate: "2026-01-01T00:00:00.000Z", endDate: "2026-01-14T00:00:00.000Z" }));
    expect(createFn).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows backend validation errors on the matching field and keeps the dialog open", async () => {
    updateFn.mockRejectedValue(new ApiError(400, "Validation failed", undefined, [{ path: "endDate", message: "endDate must be on or after startDate" }]));
    const onOpenChange = vi.fn();
    render(<SprintFormDialog mode="edit" projectId="p1" sprint={SPRINT} open onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("endDate must be on or after startDate")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
