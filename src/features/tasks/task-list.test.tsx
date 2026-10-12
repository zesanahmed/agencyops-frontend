import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskList } from "./task-list";
import { can } from "@/lib/rbac";
import type { Role, Sprint, Task } from "@/types/domain";

let role: Role = "MANAGER";
let query = "";
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => "/organizations/o1/projects/p1", useSearchParams: () => new URLSearchParams(query) }));
vi.mock("@/features/organizations/org-context", () => ({
  useOrg: () => ({ organizationId: "o1", role, membershipId: "m-me", can: (p: Parameters<typeof can>[1]) => can(role, p) }),
  Can: ({ permission, children }: { permission: Parameters<typeof can>[1]; children: React.ReactNode }) => (can(role, permission) ? children : null),
}));
vi.mock("@/features/members/use-member-directory", () => ({
  useMemberDirectory: () => ({ list: [{ id: "m-me", name: "Me" }, { id: "m2", name: "Ben" }], nameOf: (id: string) => ({ "m-me": "Me", m2: "Ben" }[id] ?? "Former member") }),
}));
const calls: Record<string, unknown>[] = [];
let tasks: Task[] = [];
let state = { isLoading: false, isError: false };
const sprints: Sprint[] = [{ id: "s1", projectId: "p1", name: "Sprint 1", goal: null, status: "ACTIVE", startDate: "", endDate: "" }];
vi.mock("@/features/projects/hooks", () => ({
  useTasks: (_o: string, _p: string, q: Record<string, unknown>) => { calls.push(q); return { data: { items: tasks, meta: { page: 1, limit: 20, total: tasks.length, totalPages: 1 } }, error: null, refetch: vi.fn(), ...state }; },
  useSprints: () => ({ data: { items: sprints } }),
}));
vi.mock("./task-form-dialog", () => ({ CreateTaskDialog: () => <button>New task</button> }));

const DAY = 86_400_000;
const day = (n: number) => new Date(Math.floor(Date.now() / DAY) * DAY + n * DAY).toISOString();
const task = (o: Partial<Task>): Task => ({ id: "t", projectId: "p1", sprintId: null, parentTaskId: null, assigneeMembershipId: null, title: "T", description: null, status: "TODO", priority: "MEDIUM", startDate: null, dueDate: null, createdAt: "", ...o });

describe("TaskList", () => {
  beforeEach(() => { role = "MANAGER"; query = ""; calls.length = 0; replace.mockReset(); tasks = []; state = { isLoading: false, isError: false }; });

  it("reads every filter and the sort from the URL and sends them to the API", () => {
    query = "status=TODO&priority=HIGH&search=login&sprint=s1&assignee=m2&sort=dueDate%3Aasc&page=2";
    render(<TaskList projectId="p1" />);
    expect(calls.at(-1)).toMatchObject({ page: 2, limit: 20, status: "TODO", priority: "HIGH", search: "login", sprintId: "s1", assigneeMembershipId: "m2", sortBy: "dueDate", sortOrder: "asc" });
    expect(screen.getByLabelText("Sort tasks")).toHaveValue("dueDate:asc");
    expect(screen.getByLabelText("Filter by sprint")).toHaveValue("s1");
  });

  it("falls back to newest-first for an unknown sort value", () => {
    query = "sort=hax";
    render(<TaskList projectId="p1" />);
    expect(calls.at(-1)).toMatchObject({ sortBy: "createdAt", sortOrder: "desc" });
  });

  it("offers 'Assigned to me' first in the assignee filter, without listing me twice", () => {
    render(<TaskList projectId="p1" />);
    const labels = within(screen.getByLabelText("Filter by assignee")).getAllByRole("option").map((o) => o.textContent);
    expect(labels).toEqual(["Everyone", "Assigned to me", "Ben"]);
  });

  it("writes a chosen sprint filter to the URL, keeping other params and resetting the page", async () => {
    query = "tab=tasks&page=3";
    render(<TaskList projectId="p1" />);
    await userEvent.selectOptions(screen.getByLabelText("Filter by sprint"), "s1");
    expect(replace).toHaveBeenCalledWith("/organizations/o1/projects/p1?tab=tasks&sprint=s1", { scroll: false });
  });

  it("shows sprint, due date and an overdue badge on each row, and nothing extra for undated work", () => {
    tasks = [
      task({ id: "a", title: "Late", sprintId: "s1", dueDate: day(-2), assigneeMembershipId: "m2" }),
      task({ id: "b", title: "Shipped", status: "DONE", dueDate: day(-9) }),
      task({ id: "c", title: "Plain" }),
    ];
    render(<TaskList projectId="p1" />);
    const late = screen.getByRole("link", { name: /Late/ });
    expect(late).toHaveTextContent("Sprint 1");
    expect(late).toHaveTextContent("2 days overdue");
    expect(late).toHaveAttribute("href", "/organizations/o1/projects/p1/tasks/a");
    expect(screen.getByRole("link", { name: /Shipped/ })).not.toHaveTextContent("overdue");
    expect(screen.getByRole("link", { name: /Plain/ })).not.toHaveTextContent("Due");
  });

  it("hides subtasks from the list", () => {
    tasks = [task({ id: "a", title: "Parent" }), task({ id: "b", title: "Child", parentTaskId: "a" })];
    render(<TaskList projectId="p1" />);
    expect(screen.getByText("Parent")).toBeInTheDocument();
    expect(screen.queryByText("Child")).not.toBeInTheDocument();
  });

  it("distinguishes 'no tasks yet' from 'no matches', and can clear all filters", async () => {
    const { unmount } = render(<TaskList projectId="p1" />);
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    unmount();
    query = "tab=tasks&status=DONE&sprint=s1";
    render(<TaskList projectId="p1" />);
    expect(screen.getByText("No tasks match")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(replace).toHaveBeenCalledWith("/organizations/o1/projects/p1?tab=tasks", { scroll: false });
  });

  it("TEAM_MEMBER can still create tasks (backend allows task:create) and sees the list", () => {
    role = "TEAM_MEMBER";
    tasks = [task({ id: "a", title: "Mine" })];
    render(<TaskList projectId="p1" />);
    expect(screen.getByText("Mine")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New task" })).toBeInTheDocument();
  });

  it("shows a retryable error when loading fails", () => {
    state = { isLoading: false, isError: true };
    render(<TaskList projectId="p1" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load tasks");
  });
});
