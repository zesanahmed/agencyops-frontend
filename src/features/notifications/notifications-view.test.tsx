import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationsView } from "./notifications-view";
import type { AppNotification } from "@/types/domain";

let query = "";
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => "/organizations/o1/notifications", useSearchParams: () => new URLSearchParams(query) }));
vi.mock("@/features/organizations/org-context", () => ({ useOrg: () => ({ organizationId: "o1" }) }));
const listFn = vi.fn(); const markRead = vi.fn(); const markAll = vi.fn();
vi.mock("@/lib/api/services", () => ({ notificationApi: { list: (...a: unknown[]) => listFn(...a), markRead: (...a: unknown[]) => markRead(...a), markAllRead: (...a: unknown[]) => markAll(...a) } }));

const hours = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const note = (o: Partial<AppNotification>): AppNotification => ({ id: "n", type: "MENTION", title: "You were mentioned in a comment", message: "Please review", readAt: null, createdAt: hours(1), ...o });
const meta = (total: number, page = 1, totalPages = 1) => ({ page, limit: 20, total, totalPages });
let items: AppNotification[] = []; let unreadTotal = 0; let listMeta = meta(0); let failList = false;

function setup() {
  listFn.mockImplementation(async (_o: string, p: { limit?: number; unreadOnly?: boolean }) => {
    if (p.limit === 1) return { items: [], meta: meta(unreadTotal) };
    if (failList) throw new Error("boom");
    return { items, meta: listMeta };
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><NotificationsView /></QueryClientProvider>);
}

describe("NotificationsView", () => {
  beforeEach(() => { query = ""; replace.mockReset(); listFn.mockReset(); markRead.mockReset(); markAll.mockReset(); items = []; unreadTotal = 0; listMeta = meta(0); failList = false; });

  it("asks for all notifications by default and for unread only when the Unread filter is on", async () => {
    setup();
    await waitFor(() => expect(listFn).toHaveBeenCalledWith("o1", { page: 1, limit: 20, unreadOnly: false }));
    listFn.mockClear();
    query = "filter=unread";
    setup();
    await waitFor(() => expect(listFn).toHaveBeenCalledWith("o1", { page: 1, limit: 20, unreadOnly: true }));
  });

  it("groups notifications by day and marks unread ones for screen readers too", async () => {
    items = [note({ id: "a", title: "Fresh one", createdAt: hours(0.2) }), note({ id: "b", title: "Old one", readAt: new Date().toISOString(), createdAt: new Date(2020, 0, 5).toISOString() })];
    listMeta = meta(2);
    setup();
    const earlier = await screen.findByRole("region", { name: "Earlier" });
    expect(within(earlier).getByText("Old one")).toBeInTheDocument();
    expect(within(earlier).queryByRole("button", { name: "Mark read" })).not.toBeInTheDocument();
    const fresh = screen.getByText("Fresh one").closest("li") as HTMLElement;
    expect(fresh).toHaveTextContent("Unread:");
    expect(within(fresh).getByText(/Mention/)).toBeInTheDocument();
    expect(within(fresh).getByRole("button", { name: "Mark read" })).toBeInTheDocument();
  });

  it("shows the unread count on the filter and enables 'Mark all read'", async () => {
    items = [note({ id: "a" })]; listMeta = meta(1); unreadTotal = 3;
    setup();
    expect(await screen.findByRole("button", { name: "Unread (3)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mark all read/ })).toBeEnabled();
  });

  it("disables 'Mark all read' when nothing is unread", async () => {
    items = [note({ id: "a", readAt: new Date().toISOString() })]; listMeta = meta(1); unreadTotal = 0;
    setup();
    await screen.findByText("You were mentioned in a comment");
    await waitFor(() => expect(screen.getByRole("button", { name: /Mark all read/ })).toBeDisabled());
    expect(screen.getByRole("button", { name: "Unread" })).toBeInTheDocument();
  });

  it("marks one notification read, and all of them read", async () => {
    markRead.mockResolvedValue({}); markAll.mockResolvedValue({});
    items = [note({ id: "a" })]; listMeta = meta(1); unreadTotal = 2;
    setup();
    await userEvent.click(await screen.findByRole("button", { name: "Mark read" }));
    await waitFor(() => expect(markRead).toHaveBeenCalledWith("o1", "a"));
    await userEvent.click(screen.getByRole("button", { name: /Mark all read/ }));
    await waitFor(() => expect(markAll).toHaveBeenCalledWith("o1"));
  });

  it("writes the filter to the URL", async () => {
    items = [note({ id: "a" })]; listMeta = meta(1);
    setup();
    await userEvent.click(await screen.findByRole("button", { name: /^Unread/ }));
    expect(replace).toHaveBeenCalledWith("/organizations/o1/notifications?filter=unread", { scroll: false });
  });

  it("explains the two empty states, and offers a way back from 'nothing unread'", async () => {
    const { unmount } = setup();
    expect(await screen.findByText("No notifications yet")).toBeInTheDocument();
    unmount();
    query = "filter=unread";
    setup();
    expect(await screen.findByText("Nothing unread")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show all notifications" }));
    expect(replace).toHaveBeenCalledWith("/organizations/o1/notifications", { scroll: false });
  });

  it("steps back to the last real page when the current page runs out (e.g. after marking the last unread item read)", async () => {
    query = "filter=unread&page=3";
    items = []; listMeta = meta(25, 3, 2);
    setup();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/organizations/o1/notifications?filter=unread&page=2", { scroll: false }));
  });

  it("links to the preferences in settings, and shows a retryable error when loading fails", async () => {
    failList = true;
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load notifications");
    expect(screen.getByRole("link", { name: /Preferences/ })).toHaveAttribute("href", "/organizations/o1/settings");
  });
});
