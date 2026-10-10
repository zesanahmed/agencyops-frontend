import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectTeamsPanel } from "./project-teams-panel";
import { can } from "@/lib/rbac";
import type { ProjectTeam, Role, Team, TeamMember } from "@/types/domain";

let role: Role = "MANAGER";
vi.mock("@/features/organizations/org-context", () => ({
  useOrg: () => ({ organizationId: "o1", role, membershipId: "m-me", roleLoading: false, can: (p: Parameters<typeof can>[1]) => can(role, p) }),
  Can: ({ permission, children, fallback = null }: { permission: Parameters<typeof can>[1]; children: React.ReactNode; fallback?: React.ReactNode }) => (can(role, permission) ? children : fallback),
}));
vi.mock("@/features/members/use-member-directory", () => ({ useMemberDirectory: () => ({ nameOf: (id: string) => ({ m1: "Ann", m2: "Ben" }[id] ?? "Former member") }) }));

const team = (id: string, name: string): Team => ({ id, name, description: null, createdAt: "" });
const TEAMS = [team("t1", "Backend"), team("t2", "Design"), team("t3", "QA")];
const ASSIGNED: ProjectTeam[] = [{ id: "pt1", projectId: "p1", teamId: "t1" }, { id: "pt2", projectId: "p1", teamId: "gone" }];
const MEMBERS: Record<string, TeamMember[]> = { t1: [{ id: "x1", teamId: "t1", membershipId: "m1" }, { id: "x2", teamId: "t1", membershipId: "m2" }] };

const assign = vi.fn(); const unassign = vi.fn();
vi.mock("@/features/teams/hooks", () => ({
  useProjectTeams: () => ({ isLoading: false, isError: false, data: ASSIGNED, refetch: vi.fn() }),
  useTeamDirectory: () => ({ list: TEAMS, isLoading: false, exists: (id: string) => TEAMS.some((t) => t.id === id), nameOf: (id: string) => TEAMS.find((t) => t.id === id)?.name ?? "Deleted team" }),
  useTeamsMembers: () => ({ byTeam: new Map(Object.entries(MEMBERS)), isLoading: false }),
  useAssignTeam: () => ({ mutate: assign, isPending: false }),
  useUnassignTeam: () => ({ mutate: unassign, isPending: false }),
}));

describe("ProjectTeamsPanel", () => {
  beforeEach(() => { assign.mockReset(); unassign.mockReset(); role = "MANAGER"; });

  it("lists assigned teams with their members, linking only teams that still exist", () => {
    render(<ProjectTeamsPanel projectId="p1" />);
    expect(screen.getByRole("link", { name: "Backend" })).toHaveAttribute("href", "/organizations/o1/teams/t1");
    expect(screen.getByRole("group", { name: "2 members" })).toBeInTheDocument();
    expect(screen.getByText(/doesn't add its people to the project/)).toBeInTheDocument();
  });

  it("shows a deleted team (the backend still lists its assignment) as 'Deleted team', unlinked, and lets you unassign it", async () => {
    render(<ProjectTeamsPanel projectId="p1" />);
    expect(screen.getByText("Deleted team")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Deleted team" })).not.toBeInTheDocument();
    expect(screen.getByText("Deleted")).toBeInTheDocument();
    expect(screen.getByText(/This team was deleted/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Unassign Deleted team" }));
    expect(unassign).toHaveBeenCalledWith({ projectId: "p1", projectTeamId: "pt2" });
  });

  it("offers only teams not yet assigned, and assigns with the project and team ids", async () => {
    render(<ProjectTeamsPanel projectId="p1" />);
    const select = screen.getByLabelText("Assign a team");
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual(["Assign a team…", "Design", "QA"]);
    await userEvent.selectOptions(select, "t2");
    expect(assign).toHaveBeenCalledWith({ projectId: "p1", teamId: "t2" });
  });

  it("TEAM_MEMBER can see assigned teams but not change them", () => {
    role = "TEAM_MEMBER";
    render(<ProjectTeamsPanel projectId="p1" />);
    expect(screen.getByRole("link", { name: "Backend" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Assign a team")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Unassign/ })).not.toBeInTheDocument();
  });
});
