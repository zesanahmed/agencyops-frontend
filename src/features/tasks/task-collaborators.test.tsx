import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskCollaborators } from "./task-collaborators";
import { can } from "@/lib/rbac";
import type { Role } from "@/types/domain";

let role: Role = "MANAGER";
vi.mock("@/features/organizations/org-context", () => ({ useOrg: () => ({ organizationId: "o1", role, can: (p: Parameters<typeof can>[1]) => can(role, p) }) }));
vi.mock("@/features/members/use-member-directory", () => ({ useMemberDirectory: () => ({ list: [{ id: "m1", name: "Ann" }, { id: "m2", name: "Ben" }, { id: "m3", name: "Cy" }], nameOf: (id: string) => ({ m1: "Ann", m2: "Ben" }[id] ?? "Former member") }) }));
const addMutate = vi.fn(); const removeMutate = vi.fn();
vi.mock("./hooks", () => ({
  useCollaborators: () => ({ isLoading: false, data: [{ id: "c1", taskId: "t1", membershipId: "m1" }] }),
  useAddCollaborator: () => ({ mutate: addMutate, isPending: false }),
  useRemoveCollaborator: () => ({ mutate: removeMutate }),
}));

describe("TaskCollaborators", () => {
  beforeEach(() => { role = "MANAGER"; addMutate.mockReset(); removeMutate.mockReset(); });

  it("lists collaborators by name and offers only people who are not already on the task", async () => {
    render(<TaskCollaborators projectId="p1" taskId="t1" />);
    expect(screen.getByText("Ann")).toBeInTheDocument();
    const options = within(screen.getByLabelText("Add collaborator")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Add collaborator…", "Ben", "Cy"]);
    await userEvent.selectOptions(screen.getByLabelText("Add collaborator"), "m2");
    expect(addMutate).toHaveBeenCalledWith("m2");
    await userEvent.click(screen.getByRole("button", { name: "Remove Ann" }));
    expect(removeMutate).toHaveBeenCalledWith("c1");
  });
});
