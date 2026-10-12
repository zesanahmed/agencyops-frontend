import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectOverview } from "./project-overview";
import type { Project, ProjectMember, ProjectTeam, Sprint, Task } from "@/types/domain";

vi.mock("@/features/organizations/org-context", () => ({ useOrg: () => ({ organizationId: "o1" }) }));
vi.mock("@/features/members/use-member-directory", () => ({ useMemberDirectory: () => ({ nameOf: (id: string) => ({ m1: "Ann", m2: "Ben" }[id] ?? "Former member") }) }));
vi.mock("@/features/teams/hooks", () => ({
  useProjectTeams: () => ({ data: teams }),
  useTeamDirectory: () => ({ exists: (id: string) => id === "t1", nameOf: () => "Backend" }),
}));

let tasksQ: { isLoading: boolean; isError: boolean; error?: unknown; data?: { items: Task[]; meta: { total: number } }; refetch: () => void };
let sprints: Sprint[] = [];
let members: ProjectMember[] = [];
let teams: ProjectTeam[] = [];
vi.mock("./hooks", () => ({
  useTasks: () => tasksQ,
  useSprints: () => ({ isLoading: false, isError: false, data: { items: sprints }, refetch: vi.fn() }),
  useProjectMembers: () => ({ isLoading: false, data: members }),
}));

const DAY = 86_400_000;
const day = (n: number) => new Date(Math.floor(Date.now() / DAY) * DAY + n * DAY).toISOString();
const PROJECT: Project = { id: "p1", name: "Site", slug: "site", description: null, status: "ACTIVE", startDate: day(-10), dueDate: day(5), createdAt: "", updatedAt: "" };
const task = (o: Partial<Task>): Task => ({ id: "t", projectId: "p1", sprintId: null, parentTaskId: null, assigneeMembershipId: "m1", title: "T", description: null, status: "TODO", priority: "MEDIUM", startDate: null, dueDate: null, createdAt: "", ...o });
const withTasks = (items: Task[], total = items.length) => { tasksQ = { isLoading: false, isError: false, data: { items, meta: { total } }, refetch: vi.fn() }; };

describe("ProjectOverview", () => {
  beforeEach(() => { sprints = []; members = []; teams = []; withTasks([]); });

  it("summarises progress, open work and schedule from the project's real tasks", () => {
    withTasks([
      task({ id: "1", status: "DONE" }), task({ id: "2", status: "DONE" }),
      task({ id: "3", status: "IN_PROGRESS" }), task({ id: "4", status: "TODO", assigneeMembershipId: null }),
    ]);
    render(<ProjectOverview project={PROJECT} onOpenTab={vi.fn()} />);
    const stat = (label: string) => screen.getByText(label).parentElement as HTMLElement;
    expect(stat("Progress")).toHaveTextContent("50%");
    expect(stat("Progress")).toHaveTextContent("2 of 4 tasks done");
    expect(stat("Open tasks")).toHaveTextContent("2");
    expect(stat("Open tasks")).toHaveTextContent("1 in progress");
    expect(stat("Unassigned")).toHaveTextContent("1");
    expect(stat("Schedule")).toHaveTextContent("Due in 5 days");
  });

  it("lists status counts as text, so the bar never carries meaning alone", () => {
    withTasks([task({ id: "1", status: "DONE" }), task({ id: "2", status: "IN_REVIEW" }), task({ id: "3", status: "IN_REVIEW" })]);
    render(<ProjectOverview project={PROJECT} onOpenTab={vi.fn()} />);
    const status = screen.getByRole("region", { name: "Work by status" });
    expect(within(status).getByText("In review").parentElement).toHaveTextContent("2");
    expect(within(status).getByText("Done").parentElement).toHaveTextContent("1");
    expect(within(status).getByText("Backlog").parentElement).toHaveTextContent("0");
  });

  it("surfaces open urgent/high tasks as links, urgent first, and ignores finished ones", () => {
    withTasks([
      task({ id: "a", title: "Tweak copy", priority: "HIGH" }),
      task({ id: "b", title: "Fix checkout", priority: "URGENT", assigneeMembershipId: null }),
      task({ id: "c", title: "Already shipped", priority: "URGENT", status: "DONE" }),
      task({ id: "d", title: "Nice to have", priority: "LOW" }),
    ]);
    render(<ProjectOverview project={PROJECT} onOpenTab={vi.fn()} />);
    const links = within(screen.getByRole("region", { name: "Needs attention" })).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([expect.stringContaining("Fix checkout"), expect.stringContaining("Tweak copy")]);
    expect(links[0]).toHaveAttribute("href", "/organizations/o1/projects/p1/tasks/b");
    expect(links[0]).toHaveTextContent("Unassigned");
    expect(screen.queryByText("Already shipped")).not.toBeInTheDocument();
  });

  it("flags overdue open tasks first on the overview, and counts them on the open-tasks card", () => {
    withTasks([
      task({ id: "a", title: "Urgent but on time", priority: "URGENT" }),
      task({ id: "b", title: "Quietly late", priority: "LOW", dueDate: day(-4) }),
      task({ id: "c", title: "Finished late", status: "DONE", dueDate: day(-9) }),
    ]);
    render(<ProjectOverview project={PROJECT} onOpenTab={vi.fn()} />);
    const links = within(screen.getByRole("region", { name: "Needs attention" })).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([expect.stringContaining("Quietly late"), expect.stringContaining("Urgent but on time")]);
    expect(links[0]).toHaveTextContent("4 days overdue");
    expect(screen.getByText("Open tasks").parentElement).toHaveTextContent("1 overdue");
    expect(screen.queryByText("Finished late")).not.toBeInTheDocument();
  });

  it("shows a calm message when nothing needs attention, and an empty-work hint for a new project", () => {
    render(<ProjectOverview project={PROJECT} onOpenTab={vi.fn()} />);
    expect(screen.getByText("No overdue, urgent or high-priority tasks open.")).toBeInTheDocument();
    expect(screen.getByText(/Add tasks in the Tasks tab/)).toBeInTheDocument();
    expect(screen.getByText("No active sprint")).toBeInTheDocument();
    expect(screen.getByText("No one is on this project yet.")).toBeInTheDocument();
    expect(screen.getByText("No teams assigned.")).toBeInTheDocument();
  });

  it("shows the active sprint with completion measured from its own tasks and the time elapsed", () => {
    sprints = [{ id: "s1", projectId: "p1", name: "Sprint 4", goal: "Ship checkout", status: "ACTIVE", startDate: day(-5), endDate: day(5) }];
    withTasks([task({ id: "1", sprintId: "s1", status: "DONE" }), task({ id: "2", sprintId: "s1" }), task({ id: "3", sprintId: null })]);
    render(<ProjectOverview project={PROJECT} onOpenTab={vi.fn()} />);
    const sprint = screen.getByRole("region", { name: "Current sprint" });
    expect(sprint).toHaveTextContent("Sprint 4");
    expect(sprint).toHaveTextContent("Ship checkout");
    expect(within(sprint).getByRole("progressbar", { name: "Sprint tasks done" })).toHaveAttribute("aria-valuenow", "50");
    expect(sprint).toHaveTextContent("1 of 2 sprint tasks done");
    expect(sprint).toHaveTextContent(/\d+% of the time window elapsed/);
  });

  it("falls back to the next planned sprint, labelled as such", () => {
    sprints = [{ id: "s2", projectId: "p1", name: "Sprint 5", goal: null, status: "PLANNED", startDate: day(7), endDate: day(21) }];
    render(<ProjectOverview project={PROJECT} onOpenTab={vi.fn()} />);
    expect(screen.getByRole("region", { name: "Next sprint" })).toHaveTextContent("Sprint 5");
    expect(screen.getByText("No tasks are planned into this sprint yet")).toBeInTheDocument();
  });

  it("names the people and teams, and marks a deleted team", () => {
    members = [{ id: "pm1", projectId: "p1", membershipId: "m1" }, { id: "pm2", projectId: "p1", membershipId: "m2" }];
    teams = [{ id: "pt1", projectId: "p1", teamId: "t1" }, { id: "pt2", projectId: "p1", teamId: "gone" }];
    render(<ProjectOverview project={PROJECT} onOpenTab={vi.fn()} />);
    expect(screen.getByText("2 people")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Assigned teams" })).getAllByRole("listitem").map((l) => l.textContent)).toEqual(["Backend", "Deleted team"]);
  });

  it("is honest when only part of a large task list was loaded", () => {
    withTasks([task({ id: "1" })], 250);
    render(<ProjectOverview project={PROJECT} onOpenTab={vi.fn()} />);
    expect(screen.getByText(/Based on the 1 most recent tasks of 250/)).toBeInTheDocument();
  });

  it("shows the date schedule for a completed project instead of an overdue warning", () => {
    render(<ProjectOverview project={{ ...PROJECT, status: "COMPLETED", dueDate: day(-30) }} onOpenTab={vi.fn()} />);
    expect(screen.getByText("Schedule").parentElement).toHaveTextContent("Completed");
    expect(screen.queryByText(/\d+ days? overdue/)).not.toBeInTheDocument();
  });

  it("deep-links to the Tasks and People tabs", async () => {
    const onOpenTab = vi.fn();
    withTasks([task({ id: "1" })]);
    render(<ProjectOverview project={PROJECT} onOpenTab={onOpenTab} />);
    await userEvent.click(screen.getByRole("button", { name: /All tasks/ }));
    await userEvent.click(screen.getByRole("button", { name: /Manage/ }));
    expect(onOpenTab.mock.calls).toEqual([["tasks"], ["people"]]);
  });

  it("shows a retryable error when the work can't be loaded", async () => {
    const refetch = vi.fn();
    tasksQ = { isLoading: false, isError: true, error: new Error("boom"), refetch };
    render(<ProjectOverview project={PROJECT} onOpenTab={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load the project overview");
    await userEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
