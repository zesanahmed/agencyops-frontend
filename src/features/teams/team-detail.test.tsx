import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TeamDetail } from "./team-detail";
import { ApiError } from "@/lib/api/errors";
import { can } from "@/lib/rbac";
import type { Membership, Project, Role, Team, TeamMember } from "@/types/domain";

let role: Role = "OWNER";
let search = "";
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => "/x", useSearchParams: () => new URLSearchParams(search) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/features/organizations/org-context", () => ({
  useOrg: () => ({ organizationId: "o1", role, membershipId: "m-me", roleLoading: false, can: (p: Parameters<typeof can>[1]) => can(role, p) }),
  Can: ({ permission, children, fallback = null }: { permission: Parameters<typeof can>[1]; children: React.ReactNode; fallback?: React.ReactNode }) => (can(role, permission) ? children : fallback),
}));

const member = (id: string, name: string, r: Role = "TEAM_MEMBER"): Membership => ({ id, userId: `u-${id}`, organizationId: "o1", role: r, status: "ACTIVE", joinedAt: "", name, email: `${name.toLowerCase()}@x.io`, avatarUrl: null });
const DIR = [member("m1", "Ann"), member("m2", "Ben", "MANAGER"), member("m3", "Cy")];
vi.mock("@/features/members/use-member-directory", () => ({
  useMemberDirectory: () => ({ list: DIR, byId: new Map(DIR.map((m) => [m.id, m])), nameOf: (id: string) => DIR.find((m) => m.id === id)?.name ?? "Former member", isLoading: false, isError: false }),
}));

const proj = (id: string, name: string): Project => ({ id, name, slug: id, description: null, status: "ACTIVE", startDate: null, dueDate: null, createdAt: "", updatedAt: "" });
const TEAM: Team = { id: "t1", name: "Backend", description: "Owns the API", createdAt: "2026-01-01T00:00:00Z" };
const TEAM_MEMBERS: TeamMember[] = [{ id: "tm1", teamId: "t1", membershipId: "m1" }, { id: "tm2", teamId: "t1", membershipId: "m2" }, { id: "tm3", teamId: "t1", membershipId: "gone" }];
const ALL_PROJECTS = [proj("p1", "Website"), proj("p2", "Mobile app")];

const state = { team: { isLoading: false, isError: false, data: TEAM as Team | undefined, error: null as unknown, refetch: vi.fn() } };
const addMember = vi.fn(); const removeMember = vi.fn(); const assign = vi.fn(); const unassign = vi.fn(); const deleteTeam = vi.fn();
vi.mock("./hooks", () => ({
  MAX_ASSIGNMENT_PROJECTS: 50,
  useTeam: () => state.team,
  useTeamMembers: () => ({ isLoading: false, isError: false, data: TEAM_MEMBERS, refetch: vi.fn() }),
  useTeamAssignments: () => ({ isLoading: false, isError: false, truncated: false, projects: ALL_PROJECTS, byTeam: new Map([["t1", [{ project: ALL_PROJECTS[0], projectTeamId: "pt1" }]]]) }),
  useAddTeamMember: () => ({ mutate: addMember, isPending: false }),
  useRemoveTeamMember: () => ({ mutate: removeMember, isPending: false }),
  useAssignTeam: () => ({ mutate: assign, isPending: false }),
  useUnassignTeam: () => ({ mutate: unassign, isPending: false }),
  useDeleteTeam: () => ({ mutateAsync: deleteTeam }),
  useCreateTeam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTeam: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
// Ann: 2 open (+1 done), Ben: 1 open, Cy (not on the team): 5 open. Team total must be 3.
const TASKS = [
  ...["TODO", "IN_REVIEW", "DONE"].map((status, i) => ({ id: `a${i}`, assigneeMembershipId: "m1", status })),
  { id: "b0", assigneeMembershipId: "m2", status: "BACKLOG" },
  ...Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, assigneeMembershipId: "m3", status: "IN_PROGRESS" })),
];
vi.mock("@/features/dashboard/use-org-work", () => ({ useOrgWork: () => ({ tasks: TASKS, isLoading: false, projectsTruncated: false, tasksTruncated: false }) }));

function renderAs(r: Role, tab = "") { role = r; search = tab ? `tab=${tab}` : ""; return render(<TeamDetail teamId="t1" />); }

describe("TeamDetail", () => {
  beforeEach(() => { [addMember, removeMember, assign, unassign, deleteTeam, replace].forEach((f) => f.mockReset()); state.team = { isLoading: false, isError: false, data: TEAM, error: null, refetch: vi.fn() }; });

  it("shows the team, its stats and per-member workload (only OPEN tasks of THIS team's members)", () => {
    renderAs("OWNER");
    expect(screen.getByRole("heading", { name: "Backend" })).toBeInTheDocument();
    expect(screen.getByText("Owns the API")).toBeInTheDocument();
    // Stat labels are <p> elements ("Members" is also a tab, which is a <button>).
    const stat = (label: string) => screen.getAllByText(label).find((el) => el.tagName === "P")!.closest("div")!.textContent;
    expect(stat("Members")).toContain("3");
    expect(stat("Projects")).toContain("1");
    expect(stat("Open tasks")).toContain("3"); // Ann 2 + Ben 1; Cy's 5 and Ann's DONE task excluded
    expect(screen.getByLabelText("2 open tasks")).toBeInTheDocument();
    expect(screen.getByLabelText("1 open tasks")).toBeInTheDocument();
  });

  it("labels a member who left the organization as 'Former member' but still lets you remove them", async () => {
    renderAs("OWNER");
    expect(screen.getByText("Former member")).toBeInTheDocument();
    expect(screen.getByText("No longer in this organization")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove Former member" }));
    expect(removeMember).toHaveBeenCalledWith("tm3");
  });

  it.each<Role>(["OWNER", "MANAGER"])("%s can edit, delete, add and remove members", async (r) => {
    renderAs(r);
    expect(screen.getByRole("button", { name: /Edit/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete team" })).toBeInTheDocument();
    const add = screen.getByLabelText("Add member to Backend");
    expect(within(add).getAllByRole("option").map((o) => o.textContent)).toEqual(["Add a member…", "Cy"]); // Ann/Ben already on the team
    await userEvent.selectOptions(add, "m3");
    expect(addMember).toHaveBeenCalledWith("m3");
    await userEvent.click(screen.getByRole("button", { name: "Remove Ann" }));
    expect(removeMember).toHaveBeenCalledWith("tm1");
  });

  it("TEAM_MEMBER sees the team read-only: no edit, delete, add or remove", () => {
    renderAs("TEAM_MEMBER");
    expect(screen.getByRole("heading", { name: "Backend" })).toBeInTheDocument();
    expect(screen.getByText("Ann")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete team" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Add member to Backend")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Remove/ })).not.toBeInTheDocument();
  });

  it("Projects tab (URL ?tab=projects): lists assignments, offers only unassigned projects, and explains the no-sync rule", async () => {
    renderAs("MANAGER", "projects");
    expect(screen.getByRole("link", { name: "Website" })).toHaveAttribute("href", "/organizations/o1/projects/p1");
    expect(screen.getByText(/doesn't add the team's people to the project/)).toBeInTheDocument();
    const select = screen.getByLabelText("Assign to a project");
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(["Assign to a project…", "Mobile app"]);
    await userEvent.selectOptions(select, "p2");
    expect(assign).toHaveBeenCalledWith({ projectId: "p2", teamId: "t1" });
    await userEvent.click(screen.getByRole("button", { name: "Unassign from Website" }));
    expect(unassign).toHaveBeenCalledWith({ projectId: "p1", projectTeamId: "pt1" });
  });

  it("TEAM_MEMBER cannot assign or unassign", () => {
    renderAs("TEAM_MEMBER", "projects");
    expect(screen.getByRole("link", { name: "Website" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Assign to a project")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Unassign/ })).not.toBeInTheDocument();
  });

  it("warns that deleting a team leaves its project assignments listed as a deleted team", async () => {
    renderAs("OWNER");
    await userEvent.click(screen.getByRole("button", { name: "Delete team" }));
    expect(await screen.findByText(/assigned to 1 project\. Those assignments will remain listed there as a deleted team/)).toBeInTheDocument();
  });

  it("shows 'Team not found' for a 404 or a malformed id (400), and a retryable error otherwise", () => {
    for (const status of [404, 400]) {
      state.team = { isLoading: false, isError: true, data: undefined, error: new ApiError(status, "x"), refetch: vi.fn() };
      const { unmount } = renderAs("OWNER");
      expect(screen.getByText("Team not found")).toBeInTheDocument();
      unmount();
    }
    state.team = { isLoading: false, isError: true, data: undefined, error: new ApiError(500, "boom"), refetch: vi.fn() };
    renderAs("OWNER");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
