import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Invoice } from "@/types/domain";
import { summarizeInvoices } from "./invoice-summary";

let perms = new Set<string>(["invoice:read"]);
vi.mock("@/features/organizations/org-context", () => ({ useOrg: () => ({ organizationId: "o1", can: (p: string) => perms.has(p) }) }));
const { api } = vi.hoisted(() => ({ api: { list: vi.fn() } }));
vi.mock("@/lib/api/services", () => ({ invoiceApi: api }));
vi.mock("./invoice-summary-chart", () => ({ InvoiceSummaryChart: ({ summary }: { summary: { paidCents: number } }) => <div data-testid="chart">paid {summary.paidCents}</div> }));
vi.mock("next/dynamic", () => ({ default: (loader: () => Promise<unknown>) => { void loader; return function Stub(props: { summary: { paidCents: number } }) { return <div data-testid="chart">paid {props.summary.paidCents}</div>; }; } }));
vi.mock("@/stores/auth-store", async (orig) => {
  const m = await orig<typeof import("@/stores/auth-store")>();
  return { ...m, useAuthStore: Object.assign((sel: (s: { status: string }) => unknown) => sel({ status: "authenticated" }), m.useAuthStore) };
});
import { BillingGlance } from "./billing-glance";

const inv = (o: Partial<Invoice>): Invoice => ({ id: "i", number: "INV-1", status: "OPEN", clientId: "c", projectId: null, issueDate: "", dueDate: "", currency: "usd", subtotalCents: 0, taxCents: 0, discountCents: 0, totalCents: 10000, notes: null, sentAt: null, paidAt: null, voidedAt: null, pdfUrl: null, pdfGeneratedAt: null, createdAt: "", items: [], payments: [], ...o });
const wrap = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><BillingGlance /></QueryClientProvider>);

describe("summarizeInvoices", () => {
  it("sums paid, awaiting and draft separately and ignores void invoices", () => {
    const s = summarizeInvoices([inv({ status: "PAID", totalCents: 5000 }), inv({ status: "PAID", totalCents: 2500 }), inv({ status: "OPEN", totalCents: 10000 }), inv({ status: "DRAFT", totalCents: 700 }), inv({ status: "VOID", totalCents: 99999 })]);
    expect(s).toMatchObject({ currency: "usd", paidCents: 7500, awaitingCents: 10000, draftCents: 700, counts: { paid: 2, awaiting: 1, draft: 1 }, considered: 4, mixedCurrencies: false });
  });
  it("returns null when there is nothing to chart (no invoices, or only void ones)", () => {
    expect(summarizeInvoices([])).toBeNull();
    expect(summarizeInvoices([inv({ status: "VOID" })])).toBeNull();
  });
  it("never adds different currencies: the most common one wins and mixed is flagged", () => {
    const s = summarizeInvoices([inv({ currency: "usd", totalCents: 100 }), inv({ currency: "usd", totalCents: 200 }), inv({ currency: "eur", totalCents: 99999 })])!;
    expect(s).toMatchObject({ currency: "usd", awaitingCents: 300, mixedCurrencies: true, considered: 2 });
  });
  it("breaks a currency tie deterministically (alphabetical)", () => {
    expect(summarizeInvoices([inv({ currency: "usd" }), inv({ currency: "eur" })])!.currency).toBe("eur");
  });
});

describe("BillingGlance", () => {
  beforeEach(() => { perms = new Set(["invoice:read"]); api.list.mockReset(); });

  it("shows awaiting and collected amounts with the chart", async () => {
    api.list.mockResolvedValue({ items: [inv({ status: "OPEN", totalCents: 15000 }), inv({ status: "PAID", totalCents: 5000 })], meta: { page: 1, limit: 100, total: 2, totalPages: 1 } });
    wrap();
    expect(await screen.findByText(/\$150\.00 awaiting payment across 1 invoice; \$50\.00 collected\./)).toBeInTheDocument();
    expect(screen.getByTestId("chart")).toBeInTheDocument();
    expect(api.list).toHaveBeenCalledWith("o1", { limit: 100 });
  });
  it("says when it is partial (more than 100 invoices) or limited to one currency", async () => {
    api.list.mockResolvedValue({ items: [inv({ currency: "usd" }), inv({ currency: "eur" }), inv({ currency: "usd" })], meta: { page: 1, limit: 100, total: 250, totalPages: 3 } });
    wrap();
    expect(await screen.findByText(/Showing USD only/)).toBeInTheDocument();
    expect(screen.getByText(/Based on your 100 most recent invoices/)).toBeInTheDocument();
  });
  it("renders nothing, and makes no request, for people without invoice access", () => {
    perms = new Set();
    const { container } = wrap();
    expect(container).toBeEmptyDOMElement();
    expect(api.list).not.toHaveBeenCalled();
  });
  it("renders nothing when there are no invoices to summarise", async () => {
    api.list.mockResolvedValue({ items: [], meta: { page: 1, limit: 100, total: 0, totalPages: 0 } });
    const { container } = wrap();
    await vi.waitFor(() => expect(api.list).toHaveBeenCalled());
    await vi.waitFor(() => expect(container).toBeEmptyDOMElement());
  });
  it("shows an error state when the figures can't be loaded", async () => {
    api.list.mockRejectedValue(new Error("boom"));
    wrap();
    expect(await screen.findByText("Couldn't load billing figures")).toBeInTheDocument();
  });
});
