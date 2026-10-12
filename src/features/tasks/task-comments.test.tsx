import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskComments } from "./task-comments";
import { can } from "@/lib/rbac";
import type { Comment, Role } from "@/types/domain";

let role: Role = "MANAGER";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), usePathname: () => "/x", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/organizations/org-context", () => ({ useOrg: () => ({ organizationId: "o1", role, membershipId: "m-me", can: (p: Parameters<typeof can>[1]) => can(role, p) }) }));
const LIST = [{ id: "m-me", name: "Me" }, { id: "m2", name: "Ben" }, { id: "m3", name: "Cy Lee" }];
vi.mock("@/features/members/use-member-directory", () => ({ useMemberDirectory: () => ({ list: LIST, byId: new Map(LIST.map((m) => [m.id, m])), nameOf: (id: string) => LIST.find((m) => m.id === id)?.name ?? "Former member" }) }));
let items: Comment[] = [];
const createFn = vi.fn(); const removeMutate = vi.fn();
vi.mock("./hooks", () => ({
  useComments: () => ({ isLoading: false, isError: false, data: { items, meta: { page: 1, limit: 20, total: items.length, totalPages: 1 } }, error: null, refetch: vi.fn() }),
  useCreateComment: () => ({ mutateAsync: createFn, isPending: false }),
  useUpdateComment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteComment: () => ({ mutate: removeMutate }),
}));
const comment = (o: Partial<Comment>): Comment => ({ id: "c", taskId: "t1", authorMembershipId: "m2", content: "hi", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...o });

describe("TaskComments", () => {
  beforeEach(() => { role = "MANAGER"; items = []; createFn.mockReset(); removeMutate.mockReset(); });

  it("highlights @mentions of known members in rendered comments as plain text", () => {
    items = [comment({ content: "Thanks @Ben and @Cy Lee, also @ghost <b>x</b>" })];
    render(<TaskComments projectId="p1" taskId="t1" />);
    const p = screen.getByText(/Thanks/);
    const marked = [...p.querySelectorAll("span")].map((s) => s.textContent);
    expect(marked).toEqual(["@Ben", "@Cy Lee"]);
    expect(p.textContent).toContain("<b>x</b>");
    expect(p.querySelector("b")).toBeNull();
  });

  it("sends the ids of the people mentioned in the final text", async () => {
    createFn.mockResolvedValue(comment({}));
    render(<TaskComments projectId="p1" taskId="t1" />);
    await userEvent.type(screen.getByRole("combobox", { name: "Write a comment" }), "Please review @be");
    await userEvent.keyboard("{Enter}");
    await userEvent.type(screen.getByRole("combobox", { name: "Write a comment" }), "today");
    await userEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(createFn).toHaveBeenCalledWith({ content: "Please review @Ben today", mentionedMembershipIds: ["m2"] });
  });

  it("does not notify someone whose @name was deleted before sending", async () => {
    createFn.mockResolvedValue(comment({}));
    render(<TaskComments projectId="p1" taskId="t1" />);
    const box = screen.getByRole("combobox", { name: "Write a comment" });
    await userEvent.type(box, "cc @be");
    await userEvent.keyboard("{Enter}");
    await userEvent.clear(box);
    await userEvent.type(box, "never mind");
    await userEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(createFn).toHaveBeenCalledWith({ content: "never mind", mentionedMembershipIds: undefined });
  });

  it("requires some text", async () => {
    render(<TaskComments projectId="p1" taskId="t1" />);
    await userEvent.click(screen.getByRole("button", { name: "Comment" }));
    expect(await screen.findByText("Write something first")).toBeInTheDocument();
    expect(createFn).not.toHaveBeenCalled();
  });

  it("authors can edit; moderators can delete anyone's; a plain member can only manage their own", () => {
    items = [comment({ id: "a", authorMembershipId: "m-me", content: "mine" }), comment({ id: "b", authorMembershipId: "m2", content: "theirs" })];
    const { unmount } = render(<TaskComments projectId="p1" taskId="t1" />);
    const mine = screen.getByText("mine").closest("li") as HTMLElement;
    const theirs = screen.getByText("theirs").closest("li") as HTMLElement;
    expect(within(mine).getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(within(theirs).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(within(theirs).getByRole("button", { name: "Delete" })).toBeInTheDocument(); // MANAGER moderates
    unmount();
    role = "TEAM_MEMBER";
    render(<TaskComments projectId="p1" taskId="t1" />);
    expect(within(screen.getByText("theirs").closest("li") as HTMLElement).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(within(screen.getByText("mine").closest("li") as HTMLElement).getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("explains the empty state", () => {
    render(<TaskComments projectId="p1" taskId="t1" />);
    expect(screen.getByText("No comments yet")).toBeInTheDocument();
  });
});
