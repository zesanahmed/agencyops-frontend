import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ClientRequest, ProjectMessage, ProjectUpdate, SharedFile } from "@/types/domain";

let query = "";
let perms = new Set<string>(["client-portal:read", "client-portal:manage"]);
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => "/organizations/o1/projects/p1", useSearchParams: () => new URLSearchParams(query) }));
vi.mock("@/features/organizations/org-context", () => ({
  useOrg: () => ({ organizationId: "o1", can: (p: string) => perms.has(p) }),
  Can: ({ permission, children }: { permission: string; children: React.ReactNode }) => (perms.has(permission) ? <>{children}</> : null),
}));
const { api, toast } = vi.hoisted(() => ({
  api: { updates: vi.fn(), postUpdate: vi.fn(), deleteUpdate: vi.fn(), messages: vi.fn(), postMessage: vi.fn(), deleteMessage: vi.fn(), files: vi.fn(), uploadFile: vi.fn(), deleteFile: vi.fn(), requests: vi.fn(), updateRequest: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/api/services", () => ({ collabApi: api }));
vi.mock("@/features/projects/hooks", () => ({ useProjects: () => ({ data: { items: [{ id: "p1", name: "Website" }, { id: "p2", name: "Mobile app" }] } }) }));
vi.mock("@/stores/auth-store", async (orig) => {
  const m = await orig<typeof import("@/stores/auth-store")>();
  return { ...m, useAuthStore: Object.assign((sel: (s: { status: string }) => unknown) => sel({ status: "authenticated" }), m.useAuthStore) };
});

import { UpdatesPanel } from "./updates-panel";
import { MessagesPanel } from "./messages-panel";
import { FilesPanel } from "./files-panel";
import { RequestsList } from "./requests-list";
import { ProjectClientTab } from "./project-client-tab";

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const meta = (total: number, page = 1, totalPages = 1) => ({ page, limit: 10, total, totalPages });
const upd = (o: Partial<ProjectUpdate> = {}): ProjectUpdate => ({ id: "u1", title: "Sprint 2 shipped", body: "Login and signup are live.", createdAt: "2026-10-05T10:00:00Z", author: { name: "Arif Hossain" }, ...o });
const msg = (o: Partial<ProjectMessage> = {}): ProjectMessage => ({ id: "m1", content: "Looks great!", createdAt: new Date().toISOString(), author: { type: "CLIENT", name: "Dana Reyes" }, ...o });
const file = (o: Partial<SharedFile> = {}): SharedFile => ({ id: "f1", originalFilename: "brief.pdf", url: "https://files.example/brief.pdf", mimeType: "application/pdf", sizeBytes: 2048, createdAt: "2026-10-05T10:00:00Z", uploadedBy: { type: "CLIENT", name: "Dana Reyes" }, ...o });
const req = (o: Partial<ClientRequest> = {}): ClientRequest => ({ id: "r1", projectId: "p1", type: "CHANGE_REQUEST", title: "Swap the hero image", description: "Use the new brand photo.", status: "OPEN", resolutionNote: null, createdAt: new Date().toISOString(), updatedAt: "", resolvedAt: null, contact: { id: "k1", name: "Dana Reyes", email: "dana@b.io" }, ...o });

beforeEach(() => { query = ""; perms = new Set(["client-portal:read", "client-portal:manage"]); replace.mockReset(); Object.values(api).forEach((f) => f.mockReset()); Object.values(toast).forEach((f) => f.mockReset()); });

describe("UpdatesPanel", () => {
  it("lists updates with author and posts a new one (trimmed, validated)", async () => {
    api.updates.mockResolvedValue({ items: [upd()], meta: meta(1) }); api.postUpdate.mockResolvedValue(upd());
    wrap(<UpdatesPanel projectId="p1" />);
    expect(await screen.findByText("Sprint 2 shipped")).toBeInTheDocument();
    expect(screen.getByText(/Arif Hossain/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Post update" }));
    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(api.postUpdate).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Title"), "  Design approved ");
    await userEvent.type(screen.getByLabelText("Details"), "Moving to build.");
    await userEvent.click(screen.getByRole("button", { name: "Post update" }));
    await waitFor(() => expect(api.postUpdate).toHaveBeenCalledWith("o1", "p1", { title: "Design approved", body: "Moving to build." }));
    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveValue("")); // form resets
  });
  it("deletes only after confirmation", async () => {
    api.updates.mockResolvedValue({ items: [upd()], meta: meta(1) }); api.deleteUpdate.mockResolvedValue(undefined);
    wrap(<UpdatesPanel projectId="p1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete update Sprint 2 shipped" }));
    expect(api.deleteUpdate).not.toHaveBeenCalled();
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete update" }));
    await waitFor(() => expect(api.deleteUpdate).toHaveBeenCalledWith("o1", "p1", "u1"));
  });
  it("read-only members see updates but no form or delete buttons; empty state explains", async () => {
    perms = new Set(["client-portal:read"]);
    api.updates.mockResolvedValue({ items: [upd()], meta: meta(1) });
    const { unmount } = wrap(<UpdatesPanel projectId="p1" />);
    await screen.findByText("Sprint 2 shipped");
    expect(screen.queryByRole("button", { name: /Post update|Delete update/ })).not.toBeInTheDocument();
    unmount();
    api.updates.mockResolvedValue({ items: [], meta: meta(0) });
    wrap(<UpdatesPanel projectId="p1" />);
    expect(await screen.findByText("No updates yet")).toBeInTheDocument();
  });
  it("shows an error state with retry", async () => {
    api.updates.mockRejectedValue(new Error("boom"));
    wrap(<UpdatesPanel projectId="p1" />);
    expect(await screen.findByText("Couldn't load updates")).toBeInTheDocument();
  });
});

describe("MessagesPanel", () => {
  it("opens on the LAST page (newest messages), since the API pages oldest-first", async () => {
    api.messages.mockImplementation(async (_o: string, _p: string, q: { page: number }) => ({ items: [msg({ id: `m${q.page}`, content: `page ${q.page}` })], meta: meta(70, q.page, 3) }));
    wrap(<MessagesPanel projectId="p1" />);
    expect(await screen.findByText("page 3")).toBeInTheDocument();
    expect(api.messages).toHaveBeenCalledWith("o1", "p1", { page: 3, limit: 30 });
    await userEvent.click(screen.getByRole("button", { name: "Show older messages" }));
    expect(await screen.findByText("page 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show newer messages" })).toBeInTheDocument();
  });
  it("tells client and team messages apart and sends a reply", async () => {
    api.messages.mockResolvedValue({ items: [msg(), msg({ id: "m2", content: "Thanks, on it.", author: { type: "STAFF", name: "Arif Hossain" } })], meta: meta(2) });
    api.postMessage.mockResolvedValue(msg());
    wrap(<MessagesPanel projectId="p1" />);
    expect(await screen.findByText("Looks great!")).toBeInTheDocument();
    expect(screen.getByText("Client")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));
    expect(await screen.findByText("Message cannot be empty")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Reply to the client"), "Will do");
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(api.postMessage).toHaveBeenCalledWith("o1", "p1", "Will do"));
  });
  it("deletes a message after confirmation; read-only users can't reply or delete", async () => {
    api.messages.mockResolvedValue({ items: [msg()], meta: meta(1) }); api.deleteMessage.mockResolvedValue(undefined);
    const { unmount } = wrap(<MessagesPanel projectId="p1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete message from Dana Reyes" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete message" }));
    await waitFor(() => expect(api.deleteMessage).toHaveBeenCalledWith("o1", "p1", "m1"));
    unmount();
    perms = new Set(["client-portal:read"]);
    wrap(<MessagesPanel projectId="p1" />);
    await screen.findByText("Looks great!");
    expect(screen.queryByLabelText("Reply to the client")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete message/ })).not.toBeInTheDocument();
  });
  it("explains an empty thread", async () => {
    api.messages.mockResolvedValue({ items: [], meta: meta(0, 1, 0) });
    wrap(<MessagesPanel projectId="p1" />);
    expect(await screen.findByText("No messages yet")).toBeInTheDocument();
  });
});

describe("FilesPanel", () => {
  it("lists files with who uploaded them and links open in a new tab", async () => {
    api.files.mockResolvedValue({ items: [file(), file({ id: "f2", originalFilename: "logo.png", mimeType: "image/png", uploadedBy: { type: "STAFF", name: "Arif Hossain" } })], meta: meta(2) });
    wrap(<FilesPanel projectId="p1" />);
    const link = await screen.findByRole("link", { name: /brief\.pdf/ });
    expect(link).toHaveAttribute("href", "https://files.example/brief.pdf");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.getByText(/PDF · 2\.0 KB/)).toBeInTheDocument();
    expect(screen.getAllByText("Client").length).toBeGreaterThan(0);
  });
  it("uploads to the project's shared files with progress wiring and refreshes the list", async () => {
    api.files.mockResolvedValue({ items: [], meta: meta(0) }); api.uploadFile.mockResolvedValue(file());
    wrap(<FilesPanel projectId="p1" />);
    await screen.findByText("No shared files");
    const input = document.getElementById("file-uploader-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "spec.pdf", { type: "application/pdf" })] } });
    await userEvent.click(await screen.findByRole("button", { name: "Upload" }));
    await waitFor(() => expect(api.uploadFile).toHaveBeenCalledTimes(1));
    const [o, p, f, opts] = api.uploadFile.mock.calls[0];
    expect([o, p, (f as File).name, typeof opts.onProgress, opts.signal instanceof AbortSignal]).toEqual(["o1", "p1", "spec.pdf", "function", true]);
    await waitFor(() => expect(api.files.mock.calls.length).toBeGreaterThan(1)); // list re-fetched
  });
  it("removes a file after confirmation; read-only users get no uploader or remove button", async () => {
    api.files.mockResolvedValue({ items: [file()], meta: meta(1) }); api.deleteFile.mockResolvedValue(undefined);
    const { unmount } = wrap(<FilesPanel projectId="p1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Remove brief.pdf" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Remove file" }));
    await waitFor(() => expect(api.deleteFile).toHaveBeenCalledWith("o1", "p1", "f1"));
    unmount();
    perms = new Set(["client-portal:read"]);
    wrap(<FilesPanel projectId="p1" />);
    await screen.findByText("brief.pdf");
    expect(screen.queryByRole("button", { name: /Share a file|Remove/ })).not.toBeInTheDocument();
  });
});

describe("RequestsList (inbox and per-project)", () => {
  it("org inbox: passes URL filters to the API, shows project names, and has a project filter", async () => {
    query = "status=OPEN&type=ISSUE&projectId=p2&page=2";
    api.requests.mockResolvedValue({ items: [req({ projectId: "p2" })], meta: meta(30, 2, 2) });
    wrap(<RequestsList />);
    expect(await screen.findByText("Swap the hero image")).toBeInTheDocument();
    expect(api.requests).toHaveBeenCalledWith("o1", { page: 2, limit: 15, status: "OPEN", type: "ISSUE", projectId: "p2" });
    expect(within(screen.getByRole("list")).getByText(/Mobile app/)).toBeInTheDocument(); // the filter also lists it
    expect(screen.getByLabelText("Filter by project")).toBeInTheDocument();
  });
  it("per-project: always scopes to its project and hides the project filter; ignores unknown filter values", async () => {
    query = "status=BOGUS&projectId=p2";
    api.requests.mockResolvedValue({ items: [req()], meta: meta(1) });
    wrap(<RequestsList projectId="p1" />);
    await screen.findByText("Swap the hero image");
    expect(api.requests).toHaveBeenCalledWith("o1", { page: 1, limit: 15, projectId: "p1" });
    expect(screen.queryByLabelText("Filter by project")).not.toBeInTheDocument();
  });
  it("distinguishes 'nothing yet' from 'nothing matches'", async () => {
    api.requests.mockResolvedValue({ items: [], meta: meta(0) });
    const { unmount } = wrap(<RequestsList />);
    expect(await screen.findByText("No client requests")).toBeInTheDocument();
    unmount();
    query = "status=RESOLVED";
    wrap(<RequestsList />);
    expect(await screen.findByText("No requests match these filters")).toBeInTheDocument();
  });
  it("opens a request and saves only what changed (status), without re-sending an untouched note", async () => {
    api.requests.mockResolvedValue({ items: [req({ resolutionNote: "Looking into it" })], meta: meta(1) }); api.updateRequest.mockResolvedValue(req({ status: "RESOLVED" }));
    wrap(<RequestsList />);
    await userEvent.click(await screen.findByRole("button", { name: /Swap the hero image/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Use the new brand photo.")).toBeInTheDocument();
    expect(within(dialog).getByText(/dana@b\.io/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Save changes" })).toBeDisabled(); // nothing changed yet
    await userEvent.selectOptions(within(dialog).getByLabelText("Status"), "RESOLVED");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.updateRequest).toHaveBeenCalledWith("o1", "r1", { status: "RESOLVED" }));
  });
  it("clearing the resolution note sends null so the server removes it", async () => {
    api.requests.mockResolvedValue({ items: [req({ resolutionNote: "Old note" })], meta: meta(1) }); api.updateRequest.mockResolvedValue(req());
    wrap(<RequestsList />);
    await userEvent.click(await screen.findByRole("button", { name: /Swap the hero image/ }));
    await userEvent.clear(screen.getByLabelText(/Resolution note/));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.updateRequest).toHaveBeenCalledWith("o1", "r1", { resolutionNote: null }));
  });
  it("read-only users can read a request and its note but not change it", async () => {
    perms = new Set(["client-portal:read"]);
    api.requests.mockResolvedValue({ items: [req({ status: "RESOLVED", resolutionNote: "Done in v2" })], meta: meta(1) });
    wrap(<RequestsList />);
    await userEvent.click(await screen.findByRole("button", { name: /Swap the hero image/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Done in v2/)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Status")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });
});

describe("ProjectClientTab", () => {
  it("shows Updates by default and the section named in the URL", async () => {
    api.updates.mockResolvedValue({ items: [upd()], meta: meta(1) }); api.files.mockResolvedValue({ items: [], meta: meta(0) });
    const { unmount } = wrap(<ProjectClientTab projectId="p1" />);
    expect(await screen.findByText("Sprint 2 shipped")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Updates" })).toHaveAttribute("aria-current", "page");
    unmount();
    query = "section=files";
    wrap(<ProjectClientTab projectId="p1" />);
    expect(await screen.findByText("No shared files")).toBeInTheDocument();
  });
  it("switching sections writes ?section= and drops list state", async () => {
    api.updates.mockResolvedValue({ items: [upd()], meta: meta(1) });
    query = "tab=client&page=3";
    wrap(<ProjectClientTab projectId="p1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Messages" }));
    expect(replace).toHaveBeenCalledWith("/organizations/o1/projects/p1?tab=client&section=messages", { scroll: false });
  });
});
