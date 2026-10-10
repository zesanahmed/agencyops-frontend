import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { TeamsView } from "./teams-view";
import { can } from "@/lib/rbac";
import type { Role, Team, TeamMember } from "@/types/domain";

let role: Role = "MANAGER";
let search = "";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), usePathname: () => "/x", useSearchParams: () => new URLSearchParams(search ? `search=${encodeURIComponent(search)}` : "") }));
vi.mock("@/features/organizations/org-context", () => ({
  useOrg: () => ({ organizationId: "o1", role, membershipId: "m-me", roleLoading: false, can: (p: Parameters<typeof can>[1]) => can(role, p) }),
  Can: ({ permission, children, fallback = null }: { permission: Parameters<typeof can>[1]; children: React.ReactNode; fallback?: React.ReactNode }) => (can(role, permission) ? children : fallback),
}));
vi.mock("@/features/members/use-member-directory", () => ({ useMemberDirectory: () => ({ nameOf: (id: string) => ({ m1: "Ann", m2: "Ben", m3: "Cy" }[id] ?? "Former member") }) }));

const team = (id: string, name: string, description: string | null = null): Team => ({ id, name, description, createdAt: "2026-01-01T00:00:00Z" });
let teams: Team[] = [];
const tm = (teamId: string, membershipId: string): TeamMember => ({ id: `${teamId}-${membershipId}`, teamId, membershipId });
const fetchedFor: string[][] = [];
vi.mock("./hooks", () => ({
  MAX_ASSIGNMENT_PROJECTS: 50,
  useTeamDirectory: () => ({ list: teams, total: teams.length, isLoading: false, isError: false, error: null, refetch: vi.fn() }),
  useTeamsMembers: (_o: string, ids: string[]) => { fetchedFor.push(ids); return { isLoading: false, byTeam: new Map<string, TeamMember[]>([["t1", [tm("t1", "m1"), tm("t1", "m2")]], ["t2", []], ["t3", [tm("t3", "m3")]]]) }; },
  useTeamAssignments: () => ({ isLoading: false, isError: false, truncated: false, projects: [], byTeam: new Map([["t1", [{ project: { id: "p1" }, projectTeamId: "x" }]]]) }),
  useCreateTeam: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTeam: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("TeamsView", () => {
  beforeEach(() => { role = "MANAGER"; search = ""; fetchedFor.length = 0; teams = [team("t1", "Backend", "Owns the API"), team("t2", "Design"), team("t3", "QA", "Quality and release")]; });

  it("renders one card per team linking to its page, with real member and project counts", () => {
    render(<TeamsView />);
    const card = screen.getByRole("link", { name: /Backend/ });
    expect(card).toHaveAttribute("href", "/organizations/o1/teams/t1");
    expect(card).toHaveTextContent("2 members · 1 project");
    expect(screen.getByRole("link", { name: /Design/ })).toHaveTextContent("No members yet");
    expect(screen.getByRole("link", { name: /Design/ })).toHaveTextContent("0 members · 0 projects");
    expect(screen.getByRole("link", { name: /QA/ })).toHaveTextContent("1 member · 0 projects");
    expect(within(card).getByRole("group", { name: "2 members" })).toBeInTheDocument(); // avatar stack
  });

  it("filters client-side by name or description and only loads members for the visible teams", () => {
    search = "release";
    render(<TeamsView />);
    expect(screen.getByRole("link", { name: /QA/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Backend/ })).not.toBeInTheDocument();
    expect(fetchedFor.at(-1)).toEqual(["t3"]);
  });

  it("is case-insensitive and shows a 'no match' state that doesn't offer to create", () => {
    search = "BACK";
    const { unmount } = render(<TeamsView />);
    expect(screen.getByRole("link", { name: /Backend/ })).toBeInTheDocument();
    unmount();
    search = "zzz";
    render(<TeamsView />);
    expect(screen.getByText("No teams match")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Create a team/ })).not.toBeInTheDocument();
  });

  it("first-run empty state invites MANAGER/OWNER to create a team, but not a TEAM_MEMBER", () => {
    teams = [];
    const { unmount } = render(<TeamsView />);
    expect(screen.getByText("No teams yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create a team/ })).toBeInTheDocument();
    unmount();
    role = "TEAM_MEMBER";
    render(<TeamsView />);
    expect(screen.getByText("No teams yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Create a team|New team/ })).not.toBeInTheDocument();
  });

  it("only MANAGER/OWNER get the New team button on a populated list", () => {
    const { unmount } = render(<TeamsView />);
    expect(screen.getByRole("button", { name: /New team/ })).toBeInTheDocument();
    unmount();
    role = "TEAM_MEMBER";
    render(<TeamsView />);
    expect(screen.getAllByRole("link", { name: /Backend|Design|QA/ })).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /New team/ })).not.toBeInTheDocument();
  });
});

