import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import HomePage from "./(marketing)/page";
import ServicesPage from "./(marketing)/services/page";
import PricingPage from "./(marketing)/pricing/page";
import AboutPage from "./(marketing)/about/page";

/** Public copy must describe the product as it is: these claims were true once and became false when the features shipped. */
const STALE = [/client collaboration is coming/i, /portal[^.]*isn.t available yet/i, /nothing in agencyops collects payment/i, /billing is being built/i, /paid plans and online payments are on the roadmap/i, /invoices with card payments[^.]*in development/i, /not yet\. online billing/i];

describe("marketing copy matches the shipped product", () => {
  it.each([["home", <HomePage key="h" />], ["product", <ServicesPage key="s" />], ["pricing", <PricingPage key="p" />], ["about", <AboutPage key="a" />]])("%s page makes no stale 'coming soon' claims", (_n, ui) => {
    const { container } = render(ui);
    const text = container.textContent ?? "";
    for (const re of STALE) expect(text).not.toMatch(re);
  });

  it("the home page presents the client portal and invoices as available, with a way in", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /Clients see progress, not your internals/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the client portal" })).toHaveAttribute("href", "/client/login");
    expect(screen.getByText(/Invoices that get paid/)).toBeInTheDocument();
  });

  it("the product page lists the portal, attachments, activity and invoices", () => {
    render(<ServicesPage />);
    for (const t of ["Clients and a separate portal", "Invoices and card payments", "Attachments", "Activity feed"]) expect(screen.getByRole("heading", { name: t })).toBeInTheDocument();
    expect(screen.getByText(/Not part of this release: an AI project assistant/)).toBeInTheDocument(); // the one thing that really isn't built
  });

  it("pricing offers Free and Pro, stays honest about limits and test mode, and invents no prices", () => {
    const { container } = render(<PricingPage />);
    expect(screen.getByRole("heading", { name: "Free" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pro" })).toBeInTheDocument();
    expect(screen.getByText(/Not yet\. The limits are listed/)).toBeInTheDocument();
    expect(screen.getByText(/test mode/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[$€£]\s?\d/); // no made-up prices
  });
});
