import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import type { PortalProject, PortalTask } from "@/types/domain";

let query = "";
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => "/client/projects/p1", useSearchParams: () => new URLSearchParams(query) }));
const { api } = vi.hoisted(() => ({ api: { list: vi.fn(), get: vi.fn(), tasks: vi.fn(), updates: vi.fn() } }));
vi.mock("@/lib/api/services", () => ({ portalProjectsApi: api, portalAuthApi: {} }));

import { PortalDashboard } from "./portal-dashboard";
import { PortalProjectsView } from "./portal-projects-view";
import { PortalProjectDetail } from "./portal-project-detail";
import { PortalAuthProvider } from "./portal-auth-provider";
import { ApiError } from "@/lib/api/errors";

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PortalAuthProvider>{ui}</PortalAuthProvider></QueryClientProvider>);
const proj = (o: Partial<PortalProject> = {}): PortalProject => ({ id: "p1", name: "Website Redesign", description: "Marketing site refresh", status: "ACTIVE", startDate: "2026-09-01T00:00:00Z", dueDate: "2026-12-01T00:00:00Z", progress: { totalTasks: 10, completedTasks: 4, percentComplete: 40, byStatus: { DONE: 4, TODO: 6 } }, ...o });
const task = (o: Partial<PortalTask> = {}): PortalTask => ({ id: "t1", title: "Design the hero", description: null, status: "IN_PROGRESS", priority: "HIGH", startDate: null, dueDate: "2026-11-15T00:00:00Z", ...o });
const meta = (total: number) => ({ page: 1, limit: 15, total, totalPages: 1 });

beforeEach(() => {
  query = ""; replace.mockReset(); Object.values(api).forEach((f) => f.mockReset());
  usePortalAuthStore.setState({ accessToken: "t", status: "authenticated", signedOut: false, contact: { id: "k1", name: "Dana Reyes", email: "d@n.io", jobTitle: null, clientOrganizationName: "Northwind", organizationName: "Brightline Studio" } });
});

describe("PortalDashboard", () => {
  it("greets the contact and summarises their shared projects", async () => {
    api.list.mockResolvedValue([proj(), proj({ id: "p2", name: "Mobile App", status: "PLANNING", progress: { totalTasks: 2, completedTasks: 0, percentComplete: 0, byStatus: { TODO: 2 } } })]);
    wrap(<PortalDashboard />);
    expect(screen.getByRole("heading", { name: "Hello, Dana" })).toBeInTheDocument();
    expect(await screen.findByText("Website Redesign")).toBeInTheDocument();
    const summary = screen.getByText("active project").closest("div")!;
    expect(within(summary.parentElement as HTMLElement).getByText("1")).toBeInTheDocument(); // only ACTIVE counts
    expect(screen.getByText("tasks completed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Website Redesign/ })).toHaveAttribute("href", "/client/projects/p1");
  });
  it("shows an empty state instead of zeros when nothing is shared", async () => {
    api.list.mockResolvedValue([]);
    wrap(<PortalDashboard />);
    expect(await screen.findByText("No projects shared with you yet")).toBeInTheDocument();
    expect(screen.queryByText("tasks in total")).not.toBeInTheDocument();
  });
});

describe("PortalProjectsView", () => {
  it("lists projects with a labelled progress bar and due date", async () => {
    api.list.mockResolvedValue([proj()]);
    wrap(<PortalProjectsView />);
    const bar = await screen.findByRole("progressbar", { name: "Website Redesign progress" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText(/4 of 10 tasks done/)).toBeInTheDocument();
    expect(screen.getByText(/Due /)).toBeInTheDocument();
  });
  it("shows an error state with retry", async () => {
    api.list.mockRejectedValue(new Error("boom"));
    wrap(<PortalProjectsView />);
    expect(await screen.findByText("Couldn't load your projects")).toBeInTheDocument();
  });
});

describe("PortalProjectDetail", () => {
  it("overview: progress and the per-status breakdown, dates", async () => {
    api.get.mockResolvedValue(proj());
    wrap(<PortalProjectDetail projectId="p1" />);
    expect(await screen.findByRole("heading", { name: "Website Redesign" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Project progress" })).toHaveAttribute("aria-valuenow", "40");
    expect(screen.getByText("4 of 10 tasks are done.")).toBeInTheDocument();
    expect(screen.queryByText("Not set")).not.toBeInTheDocument(); // both dates are set
  });
  it("says 'Not set' for a missing date", async () => {
    api.get.mockResolvedValue(proj({ dueDate: null }));
    wrap(<PortalProjectDetail projectId="p1" />);
    expect(await screen.findByText("Not set")).toBeInTheDocument();
  });
  it("a project the contact has no grant for reads as not found (the server answers 404)", async () => {
    api.get.mockRejectedValue(new ApiError(404, "Project not found"));
    wrap(<PortalProjectDetail projectId="nope" />);
    expect((await screen.findAllByText("Project not found")).length).toBeGreaterThan(0);
  });
  it("tasks tab: shows only what the API returns and filters by status in the URL", async () => {
    query = "tab=tasks&status=DONE&page=1";
    api.get.mockResolvedValue(proj()); api.tasks.mockResolvedValue({ items: [task({ status: "DONE" })], meta: meta(1) });
    wrap(<PortalProjectDetail projectId="p1" />);
    expect(await screen.findByText("Design the hero")).toBeInTheDocument();
    expect(api.tasks).toHaveBeenCalledWith("p1", { page: 1, limit: 15, status: "DONE" });
    expect(screen.queryByText(/assignee|comment/i)).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Filter by status"), "TODO");
    expect(replace).toHaveBeenCalledWith(expect.stringContaining("status=TODO"), { scroll: false });
  });
  it("tasks tab: empty states differ for filtered and unfiltered", async () => {
    query = "tab=tasks";
    api.get.mockResolvedValue(proj()); api.tasks.mockResolvedValue({ items: [], meta: meta(0) });
    wrap(<PortalProjectDetail projectId="p1" />);
    expect(await screen.findByText("No shared tasks yet")).toBeInTheDocument();
  });
  it("updates tab lists the agency's progress notes", async () => {
    query = "tab=updates";
    api.get.mockResolvedValue(proj());
    api.updates.mockResolvedValue({ items: [{ id: "u1", title: "Sprint 2 shipped", body: "Login is live.", createdAt: "2026-10-05T10:00:00Z", author: { name: "Arif Hossain" } }], meta: meta(1) });
    wrap(<PortalProjectDetail projectId="p1" />);
    expect(await screen.findByText("Sprint 2 shipped")).toBeInTheDocument();
    expect(screen.getByText(/Arif Hossain/)).toBeInTheDocument();
  });
  it("switching tabs writes ?tab= and drops list state", async () => {
    query = "tab=tasks&status=DONE&page=3";
    api.get.mockResolvedValue(proj()); api.tasks.mockResolvedValue({ items: [], meta: meta(0) });
    wrap(<PortalProjectDetail projectId="p1" />);
    await userEvent.click(await screen.findByRole("tab", { name: "Updates" }));
    expect(replace).toHaveBeenCalledWith("/client/projects/p1?tab=updates", { scroll: false });
  });
});
