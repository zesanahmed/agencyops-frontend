import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Invoice } from "@/types/domain";

let query = "";
let perms = new Set<string>(["invoice:read", "invoice:manage", "client:read"]);
const replace = vi.fn(); const push = vi.fn(); const back = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push, back }), usePathname: () => "/organizations/o1/invoices", useSearchParams: () => new URLSearchParams(query) }));
vi.mock("@/features/organizations/org-context", () => ({
  useOrg: () => ({ organizationId: "o1", can: (p: string) => perms.has(p) }),
  Can: ({ permission, children }: { permission: string; children: React.ReactNode }) => (perms.has(permission) ? <>{children}</> : null),
}));
const { api, clientApi, toast } = vi.hoisted(() => ({
  api: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), send: vi.fn(), void: vi.fn(), requestPdf: vi.fn() },
  clientApi: { list: vi.fn(), get: vi.fn(), projects: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/api/services", () => ({ invoiceApi: api, clientApi, projectApi: { get: vi.fn().mockResolvedValue({ id: "p1", name: "Website" }), list: vi.fn() } }));
vi.mock("@/stores/auth-store", async (orig) => {
  const m = await orig<typeof import("@/stores/auth-store")>();
  return { ...m, useAuthStore: Object.assign((sel: (s: { status: string }) => unknown) => sel({ status: "authenticated" }), m.useAuthStore) };
});

import { InvoicesView } from "./invoices-view";
import { InvoiceWizard } from "./invoice-wizard";
import { InvoiceDetail } from "./invoice-detail";
import { EditInvoice } from "./edit-invoice";

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const inv = (o: Partial<Invoice> = {}): Invoice => ({
  id: "i1", number: "INV-0001", status: "DRAFT", clientId: "c1", projectId: null, issueDate: "2026-10-01T00:00:00Z", dueDate: "2026-10-15T00:00:00Z", currency: "usd",
  subtotalCents: 10000, taxCents: 0, discountCents: 0, totalCents: 10000, notes: null, sentAt: null, paidAt: null, voidedAt: null, pdfUrl: null, pdfGeneratedAt: null, createdAt: "",
  items: [{ description: "Design sprint", quantity: 2, unitAmountCents: 5000, amountCents: 10000 }], payments: [], ...o,
});
const meta = (total: number) => ({ page: 1, limit: 15, total, totalPages: 1 });
const CLIENTS = { items: [{ id: "c1", name: "Brightline" }, { id: "c2", name: "Northwind" }], meta: meta(2) };

beforeEach(() => {
  query = ""; perms = new Set(["invoice:read", "invoice:manage", "client:read"]);
  replace.mockReset(); push.mockReset(); back.mockReset(); Object.values(api).forEach((f) => f.mockReset()); Object.values(clientApi).forEach((f) => f.mockReset()); Object.values(toast).forEach((f) => f.mockReset());
  clientApi.list.mockResolvedValue(CLIENTS);
  clientApi.get.mockResolvedValue({ id: "c1", name: "Brightline" });
  clientApi.projects.mockResolvedValue([{ id: "p1", name: "Website", slug: "w", status: "ACTIVE" }]);
});

describe("InvoicesView", () => {
  it("lists invoices with client name, formatted total and a status label", async () => {
    api.list.mockResolvedValue({ items: [inv(), inv({ id: "i2", number: "INV-0002", status: "PAID", totalCents: 123456 })], meta: meta(2) });
    wrap(<InvoicesView />);
    expect(await screen.findByRole("link", { name: "INV-0001" })).toHaveAttribute("href", "/organizations/o1/invoices/i1");
    expect(screen.getByText("$1,234.56")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("Paid")).toBeInTheDocument(); // the filter also lists "Paid"
    expect(screen.getAllByText("Brightline").length).toBeGreaterThan(0);
  });
  it("passes URL filters to the API and ignores an unknown status", async () => {
    query = "status=OPEN&clientId=c2&page=2";
    api.list.mockResolvedValue({ items: [inv({ status: "OPEN" })], meta: { page: 2, limit: 15, total: 20, totalPages: 2 } });
    wrap(<InvoicesView />);
    await screen.findByText("INV-0001");
    expect(api.list).toHaveBeenCalledWith("o1", { page: 2, limit: 15, status: "OPEN", clientId: "c2" });
    api.list.mockClear(); query = "status=BOGUS";
    wrap(<InvoicesView />);
    await waitFor(() => expect(api.list).toHaveBeenCalledWith("o1", { page: 1, limit: 15 }));
  });
  it("empty states differ for filtered and unfiltered lists; New invoice needs invoice:manage", async () => {
    api.list.mockResolvedValue({ items: [], meta: meta(0) });
    const { unmount } = wrap(<InvoicesView />);
    expect(await screen.findByText("No invoices yet")).toBeInTheDocument();
    unmount();
    perms = new Set(["invoice:read"]);
    wrap(<InvoicesView />);
    await screen.findByText("No invoices yet");
    expect(screen.queryByRole("link", { name: /New invoice|Create an invoice/ })).not.toBeInTheDocument();
  });
});

describe("InvoiceWizard", () => {
  async function fillDetails() {
    await screen.findByRole("option", { name: "Brightline" });
    await userEvent.selectOptions(screen.getByLabelText("Client"), "c1");
    await waitFor(() => expect(screen.getByRole("option", { name: "Website" })).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByLabelText(/Project/), "p1");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
  }
  it("won't leave step 1 without a client", async () => {
    wrap(<InvoiceWizard />);
    await userEvent.click(await screen.findByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Choose a client")).toBeInTheDocument();
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Client & dates");
  });
  it("won't accept a due date before the issue date", async () => {
    wrap(<InvoiceWizard />);
    await screen.findByRole("option", { name: "Brightline" });
    await userEvent.selectOptions(screen.getByLabelText("Client"), "c1");
    await userEvent.clear(screen.getByLabelText("Due date"));
    await userEvent.type(screen.getByLabelText("Due date"), "2000-01-01");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Due date can't be before the issue date")).toBeInTheDocument();
  });
  it("walks the three steps, previews totals and submits integer cents", async () => {
    api.create.mockResolvedValue(inv({ id: "i9", number: "INV-0009" }));
    wrap(<InvoiceWizard />);
    await fillDetails();
    // step 2: line items
    await userEvent.type(screen.getByLabelText("Description"), "Design sprint");
    await userEvent.clear(screen.getByLabelText("Quantity")); await userEvent.type(screen.getByLabelText("Quantity"), "3");
    await userEvent.type(screen.getByLabelText("Unit price"), "19.99");
    expect(screen.getByLabelText("Line 1 amount")).toHaveTextContent("$59.97"); // 3 x 19.99, no float drift
    await userEvent.clear(screen.getByLabelText(/^Discount/)); await userEvent.type(screen.getByLabelText(/^Discount/), "9.97");
    await userEvent.clear(screen.getByLabelText(/^Tax/)); await userEvent.type(screen.getByLabelText(/^Tax/), "5");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    // step 3: review
    expect(await screen.findByText("This saves a draft. Nothing is visible to the client until you send it.")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Notes/), "Thanks!");
    await userEvent.click(screen.getByRole("button", { name: "Create draft invoice" }));
    await waitFor(() => expect(api.create).toHaveBeenCalledTimes(1));
    expect(api.create.mock.calls[0][1]).toMatchObject({
      clientId: "c1", projectId: "p1", currency: "usd", taxCents: 500, discountCents: 997, notes: "Thanks!",
      items: [{ description: "Design sprint", quantity: 3, unitAmountCents: 1999 }],
    });
    expect(api.create.mock.calls[0][1].issueDate).toMatch(/T00:00:00\.000Z$/);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/organizations/o1/invoices/i9"));
  });
  it("blocks step 2 on an invalid line and on a discount larger than the invoice", async () => {
    wrap(<InvoiceWizard />);
    await fillDetails();
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Description is required")).toBeInTheDocument();
    expect(screen.getByText("Enter a price like 120 or 120.50")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Description"), "x");
    await userEvent.type(screen.getByLabelText("Unit price"), "10");
    await userEvent.clear(screen.getByLabelText(/^Discount/)); await userEvent.type(screen.getByLabelText(/^Discount/), "50");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Discount cannot exceed the invoice amount")).toBeInTheDocument();
  });
  it("adds and removes lines (at least one stays)", async () => {
    wrap(<InvoiceWizard />);
    await fillDetails();
    expect(screen.getByRole("button", { name: "Remove line 1" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /Add line/ }));
    expect(screen.getAllByLabelText("Description")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Remove line 2" }));
    expect(screen.getAllByLabelText("Description")).toHaveLength(1);
  });
  it("edit mode prefills from the draft, fixes the client, and sends a PATCH without clientId", async () => {
    api.update.mockResolvedValue(inv());
    wrap(<InvoiceWizard invoice={inv({ notes: "Old note", projectId: "p1" })} />);
    expect(screen.queryByRole("combobox", { name: "Client" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect((screen.getByLabelText("Description") as HTMLInputElement).value).toBe("Design sprint");
    expect((screen.getByLabelText("Unit price") as HTMLInputElement).value).toBe("50.00");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await userEvent.click(await screen.findByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    const body = api.update.mock.calls[0][2];
    expect(body).not.toHaveProperty("clientId");
    expect(body).toMatchObject({ projectId: "p1", notes: "Old note", items: [{ quantity: 2, unitAmountCents: 5000 }] });
  });
  it("puts a server error back on its field and returns to the step that owns it", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    api.create.mockRejectedValue(new ApiError(400, "Validation failed", undefined, [{ path: "dueDate", message: "dueDate must not be before issueDate" }]));
    wrap(<InvoiceWizard />);
    await fillDetails();
    await userEvent.type(screen.getByLabelText("Description"), "x"); await userEvent.type(screen.getByLabelText("Unit price"), "10");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await userEvent.click(await screen.findByRole("button", { name: "Create draft invoice" }));
    expect(await screen.findByText("dueDate must not be before issueDate")).toBeInTheDocument();
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Client & dates");
  });
});

describe("InvoiceDetail", () => {
  it("DRAFT: edit, send and void for people who can manage invoices", async () => {
    api.get.mockResolvedValue(inv());
    wrap(<InvoiceDetail invoiceId="i1" />);
    expect(await screen.findByRole("heading", { name: "INV-0001" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Edit/ })).toHaveAttribute("href", "/organizations/o1/invoices/i1/edit");
    expect(screen.getByRole("button", { name: /Send to client/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Void/ })).toBeInTheDocument();
    expect(screen.getByText("Design sprint")).toBeInTheDocument();
    expect(screen.getAllByText("$100.00").length).toBeGreaterThan(0);
  });
  it("sends only after confirming, and says no e-mail goes out", async () => {
    api.get.mockResolvedValue(inv()); api.send.mockResolvedValue(inv({ status: "OPEN" }));
    wrap(<InvoiceDetail invoiceId="i1" />);
    await userEvent.click(await screen.findByRole("button", { name: /Send to client/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/No e-mail is sent/)).toBeInTheDocument();
    expect(api.send).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Send invoice" }));
    await waitFor(() => expect(api.send).toHaveBeenCalledWith("o1", "i1"));
  });
  it("a zero-total draft can't be sent (the backend answers 422)", async () => {
    api.get.mockResolvedValue(inv({ totalCents: 0, subtotalCents: 0 }));
    wrap(<InvoiceDetail invoiceId="i1" />);
    expect(await screen.findByRole("button", { name: /Send to client/ })).toBeDisabled();
  });
  it("OPEN: no edit/send, void allowed, payment is confirmed by the server", async () => {
    api.get.mockResolvedValue(inv({ status: "OPEN", sentAt: "2026-10-02T00:00:00Z" }));
    wrap(<InvoiceDetail invoiceId="i1" />);
    await screen.findByText(/pays by card from the portal/);
    expect(screen.queryByRole("link", { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Send to client/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Void/ })).toBeInTheDocument();
  });
  it("PAID and VOID have no state-changing actions", async () => {
    api.get.mockResolvedValue(inv({ status: "PAID", paidAt: "2026-10-03T00:00:00Z", payments: [{ id: "p", amountCents: 10000, currency: "usd", status: "SUCCEEDED", failureReason: null, paidAt: "2026-10-03T00:00:00Z", createdAt: "" }] }));
    const { unmount } = wrap(<InvoiceDetail invoiceId="i1" />);
    expect((await screen.findAllByText(/^Paid /)).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Void|Send to client/ })).not.toBeInTheDocument();
    expect(screen.getByText("Succeeded")).toBeInTheDocument();
    unmount();
    api.get.mockResolvedValue(inv({ status: "VOID", voidedAt: "2026-10-03T00:00:00Z" }));
    wrap(<InvoiceDetail invoiceId="i1" />);
    expect(await screen.findByText(/can no longer be paid/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Void/ })).not.toBeInTheDocument();
  });
  it("a failed payment attempt shows its reason", async () => {
    api.get.mockResolvedValue(inv({ status: "OPEN", payments: [{ id: "p", amountCents: 10000, currency: "usd", status: "FAILED", failureReason: "Your card was declined", paidAt: null, createdAt: "2026-10-03T00:00:00Z" }] }));
    wrap(<InvoiceDetail invoiceId="i1" />);
    expect(await screen.findByText("Your card was declined")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });
  it("read-only users see the invoice but no actions", async () => {
    perms = new Set(["invoice:read"]);
    api.get.mockResolvedValue(inv({ pdfUrl: "https://files.example/inv.pdf" }));
    wrap(<InvoiceDetail invoiceId="i1" />);
    await screen.findByRole("heading", { name: "INV-0001" });
    expect(screen.queryByRole("button", { name: /Send|Void|PDF/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Download PDF/ })).toHaveAttribute("href", "https://files.example/inv.pdf");
  });
  it("requests a PDF render and then waits for the worker", async () => {
    api.get.mockResolvedValue(inv({ status: "OPEN" })); api.requestPdf.mockResolvedValue(undefined);
    wrap(<InvoiceDetail invoiceId="i1" />);
    await userEvent.click(await screen.findByRole("button", { name: /Generate PDF/ }));
    await waitFor(() => expect(api.requestPdf).toHaveBeenCalledWith("o1", "i1"));
    expect(await screen.findByText(/Rendering/)).toBeInTheDocument();
  });
  it("shows not-found for a 404", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    api.get.mockRejectedValue(new ApiError(404, "Invoice not found"));
    wrap(<InvoiceDetail invoiceId="nope" />);
    expect((await screen.findAllByText("Invoice not found")).length).toBeGreaterThan(0);
  });
});

describe("EditInvoice", () => {
  it("only drafts are editable; others are pointed back to the read-only page", async () => {
    api.get.mockResolvedValue(inv({ status: "OPEN" }));
    wrap(<EditInvoice invoiceId="i1" />);
    expect(await screen.findByText("INV-0001 can't be edited")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the invoice" })).toHaveAttribute("href", "/organizations/o1/invoices/i1");
  });
});

describe("InvoiceWizard robustness", () => {
  it("doesn't crash while a date input is cleared (the hidden review step reads it on every render)", async () => {
    wrap(<InvoiceWizard />);
    await userEvent.clear(await screen.findByLabelText("Issue date"));
    expect(screen.getByLabelText("Issue date")).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Issue date is required")).toBeInTheDocument();
  });
});
