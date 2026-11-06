import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Client, ClientContact, ClientProject } from "@/types/domain";

let query = "";
let perms = new Set<string>(["client:create", "client:update", "client:read", "client:manage-access", "client:delete"]);
const replace = vi.fn(); const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push }), usePathname: () => "/organizations/o1/clients", useSearchParams: () => new URLSearchParams(query) }));
vi.mock("@/features/organizations/org-context", () => ({
  useOrg: () => ({ organizationId: "o1", can: (p: string) => perms.has(p) }),
  Can: ({ permission, children }: { permission: string; children: React.ReactNode }) => (perms.has(permission) ? <>{children}</> : null),
}));
vi.mock("@/features/auth/auth-gate", () => ({}));
const { api, toast } = vi.hoisted(() => ({
  api: { list: vi.fn(), contacts: vi.fn(), createContact: vi.fn(), reinvite: vi.fn(), enableContact: vi.fn(), disableContact: vi.fn(), updateContact: vi.fn(), projects: vi.fn(), linkProject: vi.fn(), unlinkProject: vi.fn(), access: vi.fn(), grantAccess: vi.fn(), revokeAccess: vi.fn(), create: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/api/services", () => ({ clientApi: api, projectApi: { list: vi.fn() } }));
vi.mock("@/features/projects/hooks", () => ({ useProjects: () => ({ data: { items: [{ id: "p1", name: "Website" }, { id: "p2", name: "Mobile app" }, { id: "p3", name: "Brand" }] }, isLoading: false }) }));
vi.mock("@/stores/auth-store", async (orig) => {
  const m = await orig<typeof import("@/stores/auth-store")>();
  return { ...m, useAuthStore: Object.assign((sel: (s: { status: string }) => unknown) => sel({ status: "authenticated" }), m.useAuthStore) };
});

import { ClientsView } from "./clients-view";
import { ContactsPanel } from "./contacts-panel";
import { ClientProjectsPanel } from "./client-projects-panel";

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const cl = (o: Partial<Client> = {}): Client => ({ id: "c1", name: "Brightline", website: "https://brightline.io", notes: null, createdAt: "2026-10-01T00:00:00Z", updatedAt: "", ...o });
const ct = (o: Partial<ClientContact> = {}): ClientContact => ({ id: "k1", clientOrganizationId: "c1", name: "Dana Reyes", email: "dana@b.io", jobTitle: "Product lead", status: "ACTIVE", lastLoginAt: null, createdAt: "2026-10-01T00:00:00Z", ...o });
const meta = (total: number, page = 1, totalPages = 1) => ({ page, limit: 12, total, totalPages });

beforeEach(() => {
  query = ""; perms = new Set(["client:create", "client:update", "client:read", "client:manage-access", "client:delete"]);
  replace.mockReset(); push.mockReset(); Object.values(api).forEach((f) => f.mockReset()); Object.values(toast).forEach((f) => f.mockReset());
});

describe("ClientsView", () => {
  it("sends the URL's search, sort and page to the API", async () => {
    query = "search=bright&sort=name%3Aasc&page=2";
    api.list.mockResolvedValue({ items: [cl()], meta: meta(30, 2, 3) });
    wrap(<ClientsView />);
    expect(await screen.findByRole("link", { name: /Brightline/ })).toHaveAttribute("href", "/organizations/o1/clients/c1");
    expect(api.list).toHaveBeenCalledWith("o1", { page: 2, limit: 12, search: "bright", sortBy: "name", sortOrder: "asc" });
  });
  it("ignores an unknown sort value", async () => {
    query = "sort=bogus";
    api.list.mockResolvedValue({ items: [cl()], meta: meta(1) });
    wrap(<ClientsView />);
    await screen.findByText("Brightline");
    expect(api.list).toHaveBeenCalledWith("o1", { page: 1, limit: 12, sortBy: "createdAt", sortOrder: "desc" });
  });
  it("explains the empty state and offers creation only to people who can create", async () => {
    api.list.mockResolvedValue({ items: [], meta: meta(0) });
    const { unmount } = wrap(<ClientsView />);
    expect(await screen.findByText("No clients yet")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /client/i }).length).toBeGreaterThan(0);
    unmount();
    perms = new Set(["client:read"]);
    wrap(<ClientsView />);
    await screen.findByText("No clients yet");
    expect(screen.queryByRole("button", { name: /New client|Add your first client/ })).not.toBeInTheDocument();
  });
  it("says so when a search matches nothing, and shows an error with retry", async () => {
    query = "search=zzz";
    api.list.mockResolvedValueOnce({ items: [], meta: meta(0) });
    const { unmount } = wrap(<ClientsView />);
    expect(await screen.findByText("No clients match")).toBeInTheDocument();
    unmount();
    api.list.mockRejectedValue(new Error("boom"));
    wrap(<ClientsView />);
    expect(await screen.findByText("Couldn't load clients")).toBeInTheDocument();
  });
  it("creates a client and opens it", async () => {
    api.list.mockResolvedValue({ items: [], meta: meta(0) });
    api.create.mockResolvedValue(cl({ id: "c9", name: "Acme" }));
    wrap(<ClientsView />);
    await userEvent.click((await screen.findAllByRole("button", { name: /New client/ }))[0]);
    await userEvent.type(screen.getByLabelText("Name"), "Acme");
    await userEvent.type(screen.getByLabelText(/Website/), "not a url");
    await userEvent.click(screen.getByRole("button", { name: "Add client" }));
    expect(await screen.findByText(/Enter a valid URL/)).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
    await userEvent.clear(screen.getByLabelText(/Website/));
    await userEvent.click(screen.getByRole("button", { name: "Add client" }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith("o1", { name: "Acme" })); // blank optionals are omitted
    await waitFor(() => expect(push).toHaveBeenCalledWith("/organizations/o1/clients/c9"));
  });
});

describe("ContactsPanel", () => {
  const fillInvite = async () => {
    await userEvent.click((await screen.findAllByRole("button", { name: /Add contact/ }))[0]);
    await userEvent.type(screen.getByLabelText("Name"), "Sam Lee");
    await userEvent.type(screen.getByLabelText("Email"), "sam@b.io");
    await userEvent.click(screen.getByRole("button", { name: "Send invitation" }));
  };
  it("lists contacts with status and last sign-in", async () => {
    api.contacts.mockResolvedValue([ct(), ct({ id: "k2", name: "Lee Moss", status: "INVITED", email: "lee@b.io" })]);
    wrap(<ContactsPanel clientId="c1" />);
    expect(await screen.findByText("Dana Reyes")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Invited")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend invitation to Lee Moss" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resend invitation to Dana Reyes" })).not.toBeInTheDocument(); // only invited contacts
  });
  it("tells staff the invitation was e-mailed when the server returns no token", async () => {
    api.contacts.mockResolvedValue([]);
    api.createContact.mockResolvedValue({ contact: ct({ status: "INVITED", email: "sam@b.io" }), inviteToken: null });
    wrap(<ContactsPanel clientId="c1" />);
    await fillInvite();
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Invitation e-mailed to sam@b.io"));
    expect(screen.queryByLabelText("Invitation link")).not.toBeInTheDocument();
  });
  it("shows the one-time link when the server returns the token (no e-mail delivery configured)", async () => {
    api.contacts.mockResolvedValue([]);
    api.createContact.mockResolvedValue({ contact: ct({ name: "Sam Lee", status: "INVITED" }), inviteToken: "tok 123" });
    wrap(<ContactsPanel clientId="c1" />);
    await fillInvite();
    const input = await screen.findByLabelText("Invitation link");
    expect((input as HTMLInputElement).value).toMatch(/\/portal\/accept-invite\?token=tok%20123$/);
  });
  it("shows a duplicate e-mail (409) on the field", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    api.contacts.mockResolvedValue([]);
    api.createContact.mockRejectedValue(new ApiError(409, "A contact with this email already exists"));
    wrap(<ContactsPanel clientId="c1" />);
    await fillInvite();
    expect(await screen.findByText("A contact with this email already exists")).toBeInTheDocument();
  });
  it("disables a contact only after confirmation", async () => {
    api.contacts.mockResolvedValue([ct()]); api.disableContact.mockResolvedValue(undefined);
    wrap(<ContactsPanel clientId="c1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Disable Dana Reyes" }));
    expect(api.disableContact).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Disable contact" }));
    await waitFor(() => expect(api.disableContact).toHaveBeenCalledWith("o1", "c1", "k1"));
  });
  it("hides management actions from people without client:update, but keeps read-only access info", async () => {
    perms = new Set(["client:read"]);
    api.contacts.mockResolvedValue([ct({ status: "DISABLED" })]);
    wrap(<ContactsPanel clientId="c1" />);
    await screen.findByText("Dana Reyes");
    expect(screen.queryByRole("button", { name: /Add contact|Edit|Enable|Disable/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Portal access for Dana Reyes" })).toBeInTheDocument();
  });
  it("grants and revokes project access per contact", async () => {
    api.contacts.mockResolvedValue([ct()]);
    api.projects.mockResolvedValue([{ id: "p1", name: "Website", slug: "w", status: "ACTIVE" }, { id: "p2", name: "Mobile app", slug: "m", status: "ACTIVE" }] satisfies ClientProject[]);
    api.access.mockResolvedValue([{ id: "a1", clientContactId: "k1", projectId: "p1", createdAt: "" }]);
    api.grantAccess.mockResolvedValue(undefined); api.revokeAccess.mockResolvedValue(undefined);
    wrap(<ContactsPanel clientId="c1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Portal access for Dana Reyes" }));
    await userEvent.click(await screen.findByRole("button", { name: "Grant access to Mobile app" }));
    await waitFor(() => expect(api.grantAccess).toHaveBeenCalledWith("o1", "c1", "k1", "p2"));
    await userEvent.click(screen.getByRole("button", { name: "Revoke access to Website" }));
    await waitFor(() => expect(api.revokeAccess).toHaveBeenCalledWith("o1", "c1", "k1", "p1"));
  });
});

describe("ClientProjectsPanel", () => {
  it("offers only projects that aren't linked yet and links the chosen one", async () => {
    api.projects.mockResolvedValue([{ id: "p1", name: "Website", slug: "w", status: "ACTIVE" }]);
    api.linkProject.mockResolvedValue(undefined);
    wrap(<ClientProjectsPanel clientId="c1" />);
    expect(await screen.findByRole("link", { name: "Website" })).toHaveAttribute("href", "/organizations/o1/projects/p1");
    const select = screen.getByLabelText("Project to link");
    expect(within(select).queryByRole("option", { name: "Website" })).not.toBeInTheDocument();
    await userEvent.selectOptions(select, "p2");
    await userEvent.click(screen.getByRole("button", { name: /Link project/ }));
    await waitFor(() => expect(api.linkProject).toHaveBeenCalledWith("o1", "c1", "p2"));
  });
  it("unlinks after confirmation", async () => {
    api.projects.mockResolvedValue([{ id: "p1", name: "Website", slug: "w", status: "ACTIVE" }]); api.unlinkProject.mockResolvedValue(undefined);
    wrap(<ClientProjectsPanel clientId="c1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Unlink Website" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Unlink project" }));
    await waitFor(() => expect(api.unlinkProject).toHaveBeenCalledWith("o1", "c1", "p1"));
  });
  it("shows the empty state, and no link controls without manage-access", async () => {
    perms = new Set(["client:read"]);
    api.projects.mockResolvedValue([]);
    wrap(<ClientProjectsPanel clientId="c1" />);
    expect(await screen.findByText("No linked projects")).toBeInTheDocument();
    expect(screen.queryByLabelText("Project to link")).not.toBeInTheDocument();
  });
});
