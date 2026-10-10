import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamFormDialog } from "./team-form-dialog";
import { ApiError } from "@/lib/api/errors";
import type { Team } from "@/types/domain";

vi.mock("@/features/organizations/org-context", () => ({ useOrg: () => ({ organizationId: "o1" }) }));
const createFn = vi.fn(); const updateFn = vi.fn();
vi.mock("./hooks", () => ({
  useCreateTeam: () => ({ mutateAsync: createFn, isPending: false }),
  useUpdateTeam: () => ({ mutateAsync: updateFn, isPending: false }),
}));

const TEAM: Team = { id: "t1", name: "Backend", description: "Owns the API", createdAt: "" };

describe("TeamFormDialog", () => {
  beforeEach(() => { createFn.mockReset(); updateFn.mockReset(); });

  it("validates before calling the API (name required, name ≤ 150, description ≤ 2000)", async () => {
    render(<TeamFormDialog mode="create" open onOpenChange={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Create team" }));
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Name"), "x".repeat(151));
    await userEvent.click(screen.getByRole("button", { name: "Create team" }));
    expect(await screen.findByText("Name is too long")).toBeInTheDocument();
    expect(createFn).not.toHaveBeenCalled();
  });

  it("shows the backend's duplicate-name 409 on the Name field and keeps the dialog open", async () => {
    createFn.mockRejectedValue(new ApiError(409, "A team with this name already exists in the organization"));
    const onOpenChange = vi.fn();
    render(<TeamFormDialog mode="create" open onOpenChange={onOpenChange} />);
    await userEvent.type(screen.getByLabelText("Name"), "Backend");
    await userEvent.click(screen.getByRole("button", { name: "Create team" }));
    expect(await screen.findByText("A team with this name already exists in the organization")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("creates, closes and reports the new team", async () => {
    createFn.mockResolvedValue({ ...TEAM, id: "t9", name: "Design" });
    const onSaved = vi.fn(); const onOpenChange = vi.fn();
    render(<TeamFormDialog mode="create" open onOpenChange={onOpenChange} onSaved={onSaved} />);
    await userEvent.type(screen.getByLabelText("Name"), "Design");
    await userEvent.click(screen.getByRole("button", { name: "Create team" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: "t9" })));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("edit mode is prefilled, and clearing the description sends an empty string (the backend rejects null)", async () => {
    updateFn.mockResolvedValue(TEAM);
    render(<TeamFormDialog mode="edit" team={TEAM} open onOpenChange={vi.fn()} />);
    expect(screen.getByLabelText("Name")).toHaveValue("Backend");
    expect(screen.getByLabelText(/Description/)).toHaveValue("Owns the API");
    await userEvent.clear(screen.getByLabelText(/Description/));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(updateFn).toHaveBeenCalledWith({ name: "Backend", description: "" }));
    expect(createFn).not.toHaveBeenCalled();
  });
});
