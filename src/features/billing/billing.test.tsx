import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Billing } from "@/types/domain";

let search = "";
let authStatus = "authenticated";
let perms = new Set<string>(["billing:read", "billing:manage"]);
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(search), useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), usePathname: () => "/payment/success" }));
vi.mock("@/features/auth/auth-provider", () => ({ useAuth: () => ({ status: authStatus }) }));
let portalStatus = "authenticated";
vi.mock("@/features/portal/portal-auth-provider", () => ({ PortalAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>, usePortalAuth: () => ({ status: portalStatus }) }));
vi.mock("@/features/organizations/org-context", () => ({ useOrg: () => ({ organizationId: "o1", can: (p: string) => perms.has(p) }) }));
const { api, toast, inv } = vi.hoisted(() => ({ api: { get: vi.fn(), checkout: vi.fn(), portal: vi.fn() }, inv: { paymentStatus: vi.fn() }, toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/api/services", () => ({ billingApi: api, portalInvoicesApi: inv }));
import { usePortalAuthStore } from "@/stores/portal-auth-store";
vi.mock("@/stores/auth-store", async (orig) => {
  const m = await orig<typeof import("@/stores/auth-store")>();
  return { ...m, useAuthStore: Object.assign((sel: (s: { status: string }) => unknown) => sel({ status: authStatus }), m.useAuthStore) };
});

import { BillingSection } from "./billing-section";
import { PaymentSuccessView, POLL_INTERVAL_MS, POLL_TIMEOUT_MS } from "./payment-status-view";

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const free: Billing = { plan: { code: "FREE", name: "Free", maxMembers: 5, maxProjects: 3 }, subscription: { status: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, hasBillingAccount: false } };
const pro: Billing = { plan: { code: "PRO", name: "Pro", maxMembers: null, maxProjects: null }, subscription: { status: "active", currentPeriodEnd: "2026-11-20T00:00:00Z", cancelAtPeriodEnd: false, hasBillingAccount: true } };

beforeEach(() => { search = ""; authStatus = "authenticated"; portalStatus = "authenticated"; inv.paymentStatus.mockReset(); usePortalAuthStore.setState({ status: "authenticated", accessToken: "t" }); perms = new Set(["billing:read", "billing:manage"]); Object.values(api).forEach((f) => f.mockReset()); Object.values(toast).forEach((f) => f.mockReset()); });

describe("BillingSection", () => {
  const assign = vi.fn();
  beforeEach(() => { assign.mockReset(); Object.defineProperty(window, "location", { value: { ...window.location, assign }, writable: true }); });

  it("owner on the free plan can start Checkout, and the browser goes to the Stripe URL", async () => {
    api.get.mockResolvedValue(free); api.checkout.mockResolvedValue("https://checkout.stripe.com/c/pay/cs_test_1");
    wrap(<BillingSection />);
    await userEvent.click(await screen.findByRole("button", { name: "Upgrade to Pro" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://checkout.stripe.com/c/pay/cs_test_1"));
    expect(api.checkout).toHaveBeenCalledWith("o1");
  });
  it("owner on Pro sees the renewal date and can open the billing portal", async () => {
    api.get.mockResolvedValue(pro); api.portal.mockResolvedValue("https://billing.stripe.com/p/session/x");
    wrap(<BillingSection />);
    expect(await screen.findByText(/Renews on/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Upgrade to Pro" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Manage billing/ }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://billing.stripe.com/p/session/x"));
  });
  it("says when a subscription is set to cancel", async () => {
    api.get.mockResolvedValue({ ...pro, subscription: { ...pro.subscription, cancelAtPeriodEnd: true } });
    wrap(<BillingSection />);
    expect(await screen.findByText(/Cancels on/)).toBeInTheDocument();
  });
  it("managers can see the plan but not change it", async () => {
    perms = new Set(["billing:read"]);
    api.get.mockResolvedValue(free);
    wrap(<BillingSection />);
    expect(await screen.findByText("Free plan")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Upgrade|Manage billing/ })).not.toBeInTheDocument();
    expect(screen.getByText("Only the organization owner can change the plan.")).toBeInTheDocument();
  });
  it("surfaces a server refusal (e.g. payments not configured) and does not navigate", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    api.get.mockResolvedValue(free); api.checkout.mockRejectedValue(new ApiError(503, "Payments are not configured"));
    wrap(<BillingSection />);
    await userEvent.click(await screen.findByRole("button", { name: "Upgrade to Pro" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Payments are not configured"));
    expect(assign).not.toHaveBeenCalled();
  });
  it("shows an error with retry when billing can't be loaded", async () => {
    api.get.mockRejectedValue(new Error("boom"));
    wrap(<BillingSection />);
    expect(await screen.findByText("Couldn't load billing")).toBeInTheDocument();
  });
});

describe("PaymentSuccessView: the redirect proves nothing, the server does", () => {
  afterEach(() => vi.useRealTimers());

  it("polls until the SERVER reports Pro, then (and only then) says so", async () => {
    search = "type=subscription&organizationId=o1&session_id=cs_test_1";
    api.get.mockResolvedValueOnce(free).mockResolvedValueOnce(free).mockResolvedValue(pro);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    wrap(<PaymentSuccessView />);
    expect(await screen.findByText("Confirming your payment…")).toBeInTheDocument();
    expect(screen.queryByText("You're on Pro")).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS); });
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS); });
    expect(await screen.findByText("You're on Pro")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to settings" })).toHaveAttribute("href", "/organizations/o1/settings");
    const calls = api.get.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3); });
    expect(api.get.mock.calls.length).toBe(calls); // stops polling once confirmed
  });
  it("after ~30 s without confirmation it says 'processing', never 'paid'", async () => {
    search = "type=subscription&organizationId=o1&session_id=cs_test_1";
    api.get.mockResolvedValue(free);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    wrap(<PaymentSuccessView />);
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_TIMEOUT_MS + 100); });
    expect(await screen.findByText("Payment is processing")).toBeInTheDocument();
    expect(screen.queryByText("You're on Pro")).not.toBeInTheDocument();
    const calls = api.get.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3); });
    expect(api.get.mock.calls.length).toBe(calls);
  });
  it("a signed-out visitor is asked to sign in and returned to settings, with no billing request", async () => {
    search = "type=subscription&organizationId=o1&session_id=cs_test_1"; authStatus = "anonymous";
    wrap(<PaymentSuccessView />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", `/login?next=${encodeURIComponent("/organizations/o1/settings")}`);
    expect(api.get).not.toHaveBeenCalled();
  });
  it("invoice: polls the server and only then says 'received', using the Checkout session id", async () => {
    search = "type=invoice&invoiceId=i1&session_id=cs_test_abc";
    inv.paymentStatus.mockResolvedValueOnce({ invoiceStatus: "OPEN", confirmed: false, payment: { status: "PENDING", failureReason: null, paidAt: null } })
      .mockResolvedValue({ invoiceStatus: "PAID", confirmed: true, payment: { status: "SUCCEEDED", failureReason: null, paidAt: "2026-11-01T00:00:00Z" } });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    wrap(<PaymentSuccessView />);
    expect(await screen.findByText("Confirming your payment…")).toBeInTheDocument();
    expect(screen.queryByText("Payment received")).not.toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS); });
    expect(await screen.findByText("Payment received")).toBeInTheDocument();
    expect(inv.paymentStatus).toHaveBeenCalledWith("i1", "cs_test_abc");
    expect(screen.getByRole("link", { name: "View invoice" })).toHaveAttribute("href", "/client/invoices/i1");
    const calls = inv.paymentStatus.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3); });
    expect(inv.paymentStatus.mock.calls.length).toBe(calls);
  });
  it("invoice: a declined card shows the reason and a way to retry, with no success claim", async () => {
    search = "type=invoice&invoiceId=i1&session_id=cs_test_abc";
    inv.paymentStatus.mockResolvedValue({ invoiceStatus: "OPEN", confirmed: false, payment: { status: "FAILED", failureReason: "Your card was declined", paidAt: null } });
    wrap(<PaymentSuccessView />);
    expect(await screen.findByText("Your payment didn't go through")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Your card was declined");
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/client/invoices/i1");
    expect(screen.queryByText("Payment received")).not.toBeInTheDocument();
  });
  it("invoice: cancelled payments and voided invoices are reported honestly", async () => {
    search = "type=invoice&invoiceId=i1";
    inv.paymentStatus.mockResolvedValue({ invoiceStatus: "OPEN", confirmed: false, payment: { status: "CANCELED", failureReason: null, paidAt: null } });
    const { unmount } = wrap(<PaymentSuccessView />);
    expect(await screen.findByText("Payment cancelled")).toBeInTheDocument();
    expect(inv.paymentStatus).toHaveBeenCalledWith("i1", undefined); // no session id given
    unmount();
    inv.paymentStatus.mockResolvedValue({ invoiceStatus: "VOID", confirmed: false, payment: null });
    wrap(<PaymentSuccessView />);
    expect(await screen.findByText("This invoice was cancelled")).toBeInTheDocument();
  });
  it("invoice: after ~30 s without confirmation it says 'processing', never 'received'", async () => {
    search = "type=invoice&invoiceId=i1&session_id=cs_test_abc";
    inv.paymentStatus.mockResolvedValue({ invoiceStatus: "OPEN", confirmed: false, payment: { status: "PENDING", failureReason: null, paidAt: null } });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    wrap(<PaymentSuccessView />);
    await act(async () => { await vi.advanceTimersByTimeAsync(POLL_TIMEOUT_MS + 100); });
    expect(await screen.findByText("Payment is processing")).toBeInTheDocument();
    expect(screen.queryByText("Payment received")).not.toBeInTheDocument();
  });
  it("invoice: a signed-out visitor is sent to sign in and back to the invoice, with no status request", () => {
    search = "type=invoice&invoiceId=i1&session_id=cs_test_abc"; portalStatus = "anonymous"; usePortalAuthStore.setState({ status: "anonymous", accessToken: null });
    wrap(<PaymentSuccessView />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", `/client/login?next=${encodeURIComponent("/client/invoices/i1")}`);
    expect(inv.paymentStatus).not.toHaveBeenCalled();
  });
  it("invoice: an unsafe invoice id is not used to build a request", () => {
    search = "type=invoice&invoiceId=../../evil";
    wrap(<PaymentSuccessView />);
    expect(screen.getByText("Nothing to confirm here")).toBeInTheDocument();
    expect(inv.paymentStatus).not.toHaveBeenCalled();
  });
  it("without the expected parameters it explains instead of guessing", () => {
    wrap(<PaymentSuccessView />);
    expect(screen.getByText("Nothing to confirm here")).toBeInTheDocument();
    search = "type=subscription&organizationId=../../evil"; // an unsafe id is not used to build a request or a link
    wrap(<PaymentSuccessView />);
    expect(api.get).not.toHaveBeenCalled();
  });
});
