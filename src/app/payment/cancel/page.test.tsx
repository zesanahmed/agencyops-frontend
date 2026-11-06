import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PaymentCancelPage from "./page";

const show = async (sp: Record<string, string>) => render(await PaymentCancelPage({ searchParams: Promise.resolve(sp) }));

describe("/payment/cancel", () => {
  it("says nothing was charged and returns subscription users to their settings", async () => {
    await show({ type: "subscription", organizationId: "org_1" });
    expect(screen.getByText("Payment cancelled")).toBeInTheDocument();
    expect(screen.getByText(/No payment was taken/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to settings" })).toHaveAttribute("href", "/organizations/org_1/settings");
  });
  it("returns invoice payers to their invoices", async () => {
    await show({ type: "invoice", invoiceId: "i1" });
    expect(screen.getByRole("link", { name: "Back to your invoices" })).toHaveAttribute("href", "/client/invoices");
  });
  it("never builds a link from an unsafe organization id", async () => {
    await show({ type: "subscription", organizationId: "../../evil?x=1" });
    expect(screen.getByRole("link", { name: "Back to workspace" })).toHaveAttribute("href", "/organizations");
  });
});
