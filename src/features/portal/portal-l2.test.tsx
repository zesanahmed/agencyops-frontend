import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import type { ClientRequest, Invoice, PortalProject, ProjectMessage, SharedFile } from "@/types/domain";

let query = "";
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => "/client/projects/p1", useSearchParams: () => new URLSearchParams(query) }));
const { projects, invoices, toast } = vi.hoisted(() => ({
  projects: { list: vi.fn(), get: vi.fn(), tasks: vi.fn(), updates: vi.fn(), messages: vi.fn(), postMessage: vi.fn(), requests: vi.fn(), createRequest: vi.fn(), files: vi.fn(), uploadFile: vi.fn() },
  invoices: { list: vi.fn(), get: vi.fn(), checkout: vi.fn(), paymentStatus: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/api/services", () => ({ portalProjectsApi: projects, portalInvoicesApi: invoices, portalAuthApi: {} }));

import { PortalMessages } from "./portal-messages";
import { PortalRequests } from "./portal-requests";
import { PortalFiles } from "./portal-files";
import { PortalFilesPage } from "./portal-files-page";
import { PortalInvoicesView } from "./portal-invoices-view";
import { PortalInvoiceDetail } from "./portal-invoice-detail";
import { PortalDashboard } from "./portal-dashboard";
import { PortalAuthProvider } from "./portal-auth-provider";
import { ApiError } from "@/lib/api/errors";

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PortalAuthProvider>{ui}</PortalAuthProvider></QueryClientProvider>);
const meta = (total: number, page = 1, totalPages = 1) => ({ page, limit: 10, total, totalPages });
const msg = (o: Partial<ProjectMessage> = {}): ProjectMessage => ({ id: "m1", content: "Hello", createdAt: new Date().toISOString(), author: { type: "STAFF", name: "Arif Hossain" }, ...o });
const req = (o: Partial<ClientRequest> = {}): ClientRequest => ({ id: "r1", projectId: "p1", type: "CHANGE_REQUEST", title: "Swap hero image", description: "Use the new photo.", status: "OPEN", resolutionNote: null, createdAt: "2026-10-05T10:00:00Z", updatedAt: "", resolvedAt: null, ...o });
const file = (o: Partial<SharedFile> = {}): SharedFile => ({ id: "f1", originalFilename: "brief.pdf", url: "https://files.example/brief.pdf", mimeType: "application/pdf", sizeBytes: 2048, createdAt: "2026-10-05T10:00:00Z", uploadedBy: { type: "STAFF", name: "Arif Hossain" }, ...o });
const inv = (o: Partial<Invoice> = {}): Invoice => ({ id: "i1", number: "INV-0001", status: "OPEN", clientId: "", projectId: null, issueDate: "2026-10-01T00:00:00Z", dueDate: "2026-10-15T00:00:00Z", currency: "usd", subtotalCents: 10000, taxCents: 0, discountCents: 0, totalCents: 10000, notes: null, sentAt: null, paidAt: null, voidedAt: null, pdfUrl: null, pdfGeneratedAt: null, createdAt: "", items: [{ description: "Design sprint", quantity: 2, unitAmountCents: 5000, amountCents: 10000 }], payments: [], ...o });
const proj = (o: Partial<PortalProject> = {}): PortalProject => ({ id: "p1", name: "Website", description: null, status: "ACTIVE", startDate: null, dueDate: null, progress: { totalTasks: 0, completedTasks: 0, percentComplete: 0, byStatus: {} }, ...o });

beforeEach(() => {
  query = ""; replace.mockReset();
  for (const g of [projects, invoices, toast]) Object.values(g).forEach((f) => f.mockReset());
  URL.createObjectURL = vi.fn(() => "blob:x"); URL.revokeObjectURL = vi.fn();
  usePortalAuthStore.setState({ accessToken: "t", status: "authenticated", signedOut: false, contact: { id: "k1", name: "Dana Reyes", email: "d@n.io", jobTitle: null, clientOrganizationName: "Northwind", organizationName: "Brightline Studio" } });
});

describe("PortalMessages", () => {
  it("opens on the last page, labels the agency, and calls the client's own messages 'You'", async () => {
    projects.messages.mockImplementation(async (_id: string, q: { page: number }) => ({ items: [msg({ id: `a${q.page}`, content: `page ${q.page}` }), msg({ id: `b${q.page}`, content: "mine", author: { type: "CLIENT", name: "Dana Reyes" } })], meta: meta(70, q.page, 3) }));
    wrap(<PortalMessages projectId="p1" />);
    expect(await screen.findByText("page 3")).toBeInTheDocument();
    expect(projects.messages).toHaveBeenCalledWith("p1", { page: 3, limit: 30 });
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Agency")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show older messages" }));
    expect(await screen.findByText("page 2")).toBeInTheDocument();
  });
  it("validates and sends a message", async () => {
    projects.messages.mockResolvedValue({ items: [], meta: meta(0, 1, 0) }); projects.postMessage.mockResolvedValue(msg());
    wrap(<PortalMessages projectId="p1" />);
    expect(await screen.findByText("No messages yet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(await screen.findByText("Message cannot be empty")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Write a message"), "Can we meet Friday?");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(projects.postMessage).toHaveBeenCalledWith("p1", "Can we meet Friday?"));
  });
});

describe("PortalRequests", () => {
  it("lists the contact's requests with status and the agency's reply", async () => {
    projects.requests.mockResolvedValue({ items: [req({ status: "RESOLVED", resolutionNote: "Done in v2" })], meta: meta(1) });
    wrap(<PortalRequests projectId="p1" />);
    expect(await screen.findByText("Swap hero image")).toBeInTheDocument();
    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(screen.getByText(/Done in v2/)).toBeInTheDocument();
  });
  it("raises a new request with validation, and sends the chosen type", async () => {
    projects.requests.mockResolvedValue({ items: [], meta: meta(0) }); projects.createRequest.mockResolvedValue(req());
    wrap(<PortalRequests projectId="p1" />);
    expect(await screen.findByText("No requests yet")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: /New request/ })[0]);
    await userEvent.click(screen.getByRole("button", { name: "Send request" }));
    expect(await screen.findByText("Give your request a short title")).toBeInTheDocument();
    expect(projects.createRequest).not.toHaveBeenCalled();
    await userEvent.selectOptions(screen.getByLabelText("Type"), "ISSUE");
    await userEvent.type(screen.getByLabelText("Title"), "Login broken");
    await userEvent.type(screen.getByLabelText("Details"), "Error on step 2.");
    await userEvent.click(screen.getByRole("button", { name: "Send request" }));
    await waitFor(() => expect(projects.createRequest).toHaveBeenCalledWith("p1", { type: "ISSUE", title: "Login broken", description: "Error on step 2." }));
  });
});

describe("PortalFiles / PortalFilesPage", () => {
  it("lists files (agency uploads badged) and uploads through the project's endpoint", async () => {
    projects.files.mockResolvedValue({ items: [file()], meta: meta(1) }); projects.uploadFile.mockResolvedValue(file());
    wrap(<PortalFiles projectId="p1" />);
    const link = await screen.findByRole("link", { name: /brief\.pdf/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByText("Agency")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove|Delete/ })).not.toBeInTheDocument(); // contacts can't delete
    fireEvent.change(document.getElementById("file-uploader-input")!, { target: { files: [new File(["x"], "spec.pdf", { type: "application/pdf" })] } });
    await userEvent.click(await screen.findByRole("button", { name: "Upload" }));
    await waitFor(() => expect(projects.uploadFile).toHaveBeenCalledTimes(1));
    expect(projects.uploadFile.mock.calls[0][0]).toBe("p1");
    expect(projects.uploadFile.mock.calls[0][2]).toMatchObject({ onProgress: expect.any(Function), signal: expect.any(AbortSignal) });
  });
  it("the Files page picks a project (default first, or ?project=) and shows its files", async () => {
    projects.list.mockResolvedValue([proj(), proj({ id: "p2", name: "Mobile app" })]); projects.files.mockResolvedValue({ items: [], meta: meta(0) });
    query = "project=p2";
    wrap(<PortalFilesPage />);
    expect(await screen.findByText("No files yet")).toBeInTheDocument();
    expect(projects.files).toHaveBeenCalledWith("p2", { page: 1, limit: 12 });
    await userEvent.selectOptions(screen.getByLabelText("Project"), "p1");
    expect(replace).toHaveBeenCalledWith("/client/projects/p1?project=p1", { scroll: false });
  });
  it("the Files page explains when nothing is shared", async () => {
    projects.list.mockResolvedValue([]);
    wrap(<PortalFilesPage />);
    expect(await screen.findByText("No projects shared with you yet")).toBeInTheDocument();
  });
});

describe("Portal invoices", () => {
  it("lists invoices with amount, due date and status", async () => {
    invoices.list.mockResolvedValue({ items: [inv(), inv({ id: "i2", number: "INV-0002", status: "PAID", totalCents: 123456 })], meta: meta(2) });
    wrap(<PortalInvoicesView />);
    expect(await screen.findByRole("link", { name: /INV-0001/ })).toHaveAttribute("href", "/client/invoices/i1");
    expect(screen.getByText("$1,234.56")).toBeInTheDocument();
    expect(screen.getByText("Awaiting payment")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });
  it("explains an empty list and shows errors with retry", async () => {
    invoices.list.mockResolvedValue({ items: [], meta: meta(0) });
    const { unmount } = wrap(<PortalInvoicesView />);
    expect(await screen.findByText("No invoices yet")).toBeInTheDocument();
    unmount();
    invoices.list.mockRejectedValue(new Error("boom"));
    wrap(<PortalInvoicesView />);
    expect(await screen.findByText("Couldn't load your invoices")).toBeInTheDocument();
  });
  describe("detail", () => {
    const assign = vi.fn();
    beforeEach(() => { assign.mockReset(); Object.defineProperty(window, "location", { value: { ...window.location, assign }, writable: true }); });

    it("OPEN: shows the amount, and Pay asks the server for a Checkout session then leaves for Stripe", async () => {
      invoices.get.mockResolvedValue(inv()); invoices.checkout.mockResolvedValue("https://checkout.stripe.com/c/pay/cs_test_1");
      wrap(<PortalInvoiceDetail invoiceId="i1" />);
      await userEvent.click(await screen.findByRole("button", { name: /Pay \$100\.00/ }));
      await waitFor(() => expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/pay/cs_test_1"));
      expect(invoices.checkout).toHaveBeenCalledWith("i1");
      expect(screen.getByText("Design sprint")).toBeInTheDocument();
    });
    it("a refused checkout (409 already paid / 503 not configured) shows the server's message and doesn't navigate", async () => {
      invoices.get.mockResolvedValue(inv()); invoices.checkout.mockRejectedValue(new ApiError(409, "This invoice can no longer be paid"));
      wrap(<PortalInvoiceDetail invoiceId="i1" />);
      await userEvent.click(await screen.findByRole("button", { name: /Pay/ }));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This invoice can no longer be paid"));
      expect(assign).not.toHaveBeenCalled();
    });
    it("PAID and VOID can't be paid; the PDF link appears when the worker has produced it", async () => {
      invoices.get.mockResolvedValue(inv({ status: "PAID", paidAt: "2026-10-03T00:00:00Z", pdfUrl: "https://files.example/i.pdf" }));
      const { unmount } = wrap(<PortalInvoiceDetail invoiceId="i1" />);
      expect(await screen.findByText(/Thank you/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Pay/ })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Download PDF/ })).toHaveAttribute("href", "https://files.example/i.pdf");
      unmount();
      invoices.get.mockResolvedValue(inv({ status: "VOID" }));
      wrap(<PortalInvoiceDetail invoiceId="i1" />);
      expect(await screen.findByText(/cancelled by your agency/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Pay/ })).not.toBeInTheDocument();
    });
    it("an invoice outside the contact's access is just 'not found'", async () => {
      invoices.get.mockRejectedValue(new ApiError(404, "Invoice not found"));
      wrap(<PortalInvoiceDetail invoiceId="nope" />);
      expect((await screen.findAllByText("Invoice not found")).length).toBeGreaterThan(0);
    });
  });
});

describe("PortalDashboard invoice summary", () => {
  it("flags invoices awaiting payment with their combined amount", async () => {
    projects.list.mockResolvedValue([proj()]);
    invoices.list.mockResolvedValue({ items: [inv(), inv({ id: "i2", totalCents: 5000 }), inv({ id: "i3", status: "PAID" })], meta: meta(3) });
    wrap(<PortalDashboard />);
    const link = await screen.findByRole("link", { name: /2 invoices are awaiting payment/ });
    expect(link).toHaveAttribute("href", "/client/invoices");
    expect(within(link).getByText(/\$150\.00/)).toBeInTheDocument();
  });
  it("shows nothing about invoices when none are awaiting payment", async () => {
    projects.list.mockResolvedValue([proj()]); invoices.list.mockResolvedValue({ items: [inv({ status: "PAID" })], meta: meta(1) });
    wrap(<PortalDashboard />);
    await screen.findByText("Website");
    expect(screen.queryByText(/awaiting payment/)).not.toBeInTheDocument();
  });
});
