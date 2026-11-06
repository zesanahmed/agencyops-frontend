import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { TaskAttachment } from "@/types/domain";

let perms = new Set<string>(["task:read", "task:update", "client-portal:manage"]);
vi.mock("@/features/organizations/org-context", () => ({ useOrg: () => ({ organizationId: "o1", can: (p: string) => perms.has(p) }) }));
vi.mock("@/features/members/use-member-directory", () => ({ useMemberDirectory: () => ({ list: [{ id: "m1", name: "Ann Lee" }] }) }));
const { att, collab, toast } = vi.hoisted(() => ({
  att: { list: vi.fn(), upload: vi.fn(), remove: vi.fn() },
  collab: { setTaskVisibility: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/api/services", () => ({ attachmentApi: att, collabApi: collab }));
vi.mock("@/stores/auth-store", async (orig) => {
  const m = await orig<typeof import("@/stores/auth-store")>();
  return { ...m, useAuthStore: Object.assign((sel: (s: { status: string }) => unknown) => sel({ status: "authenticated" }), m.useAuthStore) };
});
import { TaskAttachments } from "./task-attachments";
import { TaskClientVisibility } from "./task-client-visibility";

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const a = (o: Partial<TaskAttachment> = {}): TaskAttachment => ({ id: "a1", taskId: "t1", uploadedByMembershipId: "m1", originalFilename: "wireframe.png", url: "https://files.example/w.png", mimeType: "image/png", sizeBytes: 150_000, createdAt: "2026-10-05T10:00:00Z", ...o });

beforeEach(() => { perms = new Set(["task:read", "task:update", "client-portal:manage"]); Object.values(att).forEach((f) => f.mockReset()); collab.setTaskVisibility.mockReset(); Object.values(toast).forEach((f) => f.mockReset()); URL.createObjectURL = vi.fn(() => "blob:x"); URL.revokeObjectURL = vi.fn(); });

describe("TaskAttachments", () => {
  it("lists attachments with uploader and size; links open in a new tab", async () => {
    att.list.mockResolvedValue([a(), a({ id: "a2", originalFilename: "notes.pdf", mimeType: "application/pdf", uploadedByMembershipId: "gone" })]);
    wrap(<TaskAttachments projectId="p1" taskId="t1" />);
    const link = await screen.findByRole("link", { name: /wireframe\.png/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByText(/PNG · 146 KB · Ann Lee/)).toBeInTheDocument();
    expect(screen.getByText(/A former member/)).toBeInTheDocument(); // an uploader who has since left
  });
  it("uploads a file to the task and refreshes", async () => {
    att.list.mockResolvedValue([]); att.upload.mockResolvedValue(a());
    wrap(<TaskAttachments projectId="p1" taskId="t1" />);
    await screen.findByText("No files attached yet.");
    fireEvent.change(document.getElementById("file-uploader-input")!, { target: { files: [new File(["x"], "spec.pdf", { type: "application/pdf" })] } });
    await userEvent.click(await screen.findByRole("button", { name: "Upload" }));
    await waitFor(() => expect(att.upload).toHaveBeenCalledTimes(1));
    expect(att.upload.mock.calls[0].slice(0, 3)).toEqual(["o1", "p1", "t1"]);
    await waitFor(() => expect(att.list.mock.calls.length).toBeGreaterThan(1));
  });
  it("removes after confirmation", async () => {
    att.list.mockResolvedValue([a()]); att.remove.mockResolvedValue(undefined);
    wrap(<TaskAttachments projectId="p1" taskId="t1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Remove wireframe.png" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Remove file" }));
    await waitFor(() => expect(att.remove).toHaveBeenCalledWith("o1", "p1", "t1", "a1"));
  });
  it("read-only users see files but can't attach or remove", async () => {
    perms = new Set(["task:read"]);
    att.list.mockResolvedValue([a()]);
    wrap(<TaskAttachments projectId="p1" taskId="t1" />);
    await screen.findByRole("link", { name: /wireframe\.png/ });
    expect(screen.queryByRole("button", { name: /Attach a file|Remove/ })).not.toBeInTheDocument();
  });
  it("surfaces a load failure with retry", async () => {
    att.list.mockRejectedValue(new Error("boom"));
    wrap(<TaskAttachments projectId="p1" taskId="t1" />);
    expect(await screen.findByText("Couldn't load attachments")).toBeInTheDocument();
  });
});

describe("TaskClientVisibility", () => {
  it("is absent without client-portal:manage", () => {
    perms = new Set(["task:read"]);
    const { container } = wrap(<TaskClientVisibility projectId="p1" taskId="t1" />);
    expect(container).toBeEmptyDOMElement();
  });
  it("when the current value is unknown, sets it explicitly and then reflects the server's answer", async () => {
    collab.setTaskVisibility.mockResolvedValue(true);
    wrap(<TaskClientVisibility projectId="p1" taskId="t1" />);
    expect(screen.queryByText(/Visible to the client|Hidden from the client/)).not.toBeInTheDocument(); // no guessing
    await userEvent.click(screen.getByRole("button", { name: /Show to client/ }));
    await waitFor(() => expect(collab.setTaskVisibility).toHaveBeenCalledWith("o1", "p1", "t1", true));
    expect(await screen.findByText("Visible to the client")).toBeInTheDocument();
    collab.setTaskVisibility.mockResolvedValue(false);
    await userEvent.click(screen.getByRole("button", { name: "Hide from client" }));
    expect(await screen.findByText("Hidden from the client")).toBeInTheDocument();
    expect(collab.setTaskVisibility).toHaveBeenLastCalledWith("o1", "p1", "t1", false);
  });
  it("when the task already reports its visibility, shows it and offers the opposite", async () => {
    collab.setTaskVisibility.mockResolvedValue(true);
    wrap(<TaskClientVisibility projectId="p1" taskId="t1" initial={false} />);
    expect(screen.getByText("Hidden from the client")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show to client" }));
    await waitFor(() => expect(collab.setTaskVisibility).toHaveBeenCalledWith("o1", "p1", "t1", true));
  });
});
