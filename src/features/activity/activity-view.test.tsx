import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityView } from "./activity-view";
import type { Activity } from "@/types/domain";

let query = "";
let role = "OWNER";
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => "/organizations/o1/activity", useSearchParams: () => new URLSearchParams(query) }));
vi.mock("@/features/organizations/org-context", () => ({ useOrg: () => ({ organizationId: "o1", role }) }));
vi.mock("@/features/projects/hooks", () => ({ useProjects: () => ({ data: { items: [{ id: "p1", name: "Website Redesign" }, { id: "p2", name: "Mobile App MVP" }] } }) }));
const listFn = vi.fn();
vi.mock("@/lib/api/services", () => ({ activityApi: { list: (...a: unknown[]) => listFn(...a) } }));

const act = (o: Partial<Activity>): Activity => ({ id: "a", action: "task.created", entityType: "Task", entityId: "t1", projectId: "p1", taskId: "t1", actor: { membershipId: "m1", name: "Arif Hossain" }, summary: "Arif Hossain created task “Migrate blog content”", metadata: {}, createdAt: new Date().toISOString(), ...o });
const meta = (total: number, page = 1, totalPages = 1) => ({ page, limit: 20, total, totalPages });
let items: Activity[] = []; let listMeta = meta(0); let fail = false;

function setup() {
  listFn.mockImplementation(async () => { if (fail) throw new Error("boom"); return { items, meta: listMeta }; });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><ActivityView /></QueryClientProvider>);
}

describe("ActivityView", () => {
  beforeEach(() => { query = ""; role = "OWNER"; replace.mockReset(); listFn.mockReset(); items = []; listMeta = meta(0); fail = false; });

  it("renders the server's summary as a link to the task", async () => {
    items = [act({})]; listMeta = meta(1);
    setup();
    const link = await screen.findByRole("link", { name: "Arif Hossain created task “Migrate blog content”" });
    expect(link).toHaveAttribute("href", "/organizations/o1/projects/p1/tasks/t1");
    await waitFor(() => expect(listFn).toHaveBeenCalledWith("o1", { page: 1, limit: 20 }));
  });

  it("does not link deleted things", async () => {
    items = [act({ id: "d", action: "task.deleted", summary: "Arif Hossain deleted task “Old”" })]; listMeta = meta(1);
    setup();
    expect(await screen.findByText("Arif Hossain deleted task “Old”")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /deleted task/ })).not.toBeInTheDocument();
  });

  it("sends URL filters and page to the API, ignoring an unknown entity type", async () => {
    query = "entityType=Task&projectId=p2&page=2";
    items = [act({})]; listMeta = meta(25, 2, 2);
    setup();
    await waitFor(() => expect(listFn).toHaveBeenCalledWith("o1", { page: 2, limit: 20, entityType: "Task", projectId: "p2" }));
    listFn.mockClear();
    query = "entityType=Bogus";
    setup();
    await waitFor(() => expect(listFn).toHaveBeenCalledWith("o1", { page: 1, limit: 20 }));
  });

  it("writes a filter change to the URL", async () => {
    items = [act({})]; listMeta = meta(1);
    setup();
    await userEvent.selectOptions(await screen.findByLabelText("Filter by type"), "Sprint");
    expect(replace).toHaveBeenCalledWith("/organizations/o1/activity?entityType=Sprint", { scroll: false });
  });

  it("explains both empty states and offers to clear filters", async () => {
    const { unmount } = setup();
    expect(await screen.findByText("No activity yet")).toBeInTheDocument();
    unmount();
    query = "entityType=Task";
    setup();
    expect(await screen.findByText("No activity matches these filters")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: /Clear filters/ })[0]);
    expect(replace).toHaveBeenCalledWith("/organizations/o1/activity", { scroll: false });
  });

  it("tells team members why they only see some projects", async () => {
    role = "TEAM_MEMBER"; items = [act({})]; listMeta = meta(1);
    setup();
    expect(await screen.findByText(/projects you belong to/)).toBeInTheDocument();
  });

  it("shows an error state with retry when the request fails", async () => {
    fail = true;
    setup();
    expect(await screen.findByText("Couldn't load activity")).toBeInTheDocument();
  });
});
