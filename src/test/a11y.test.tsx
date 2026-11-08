import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { a11yViolations } from "./axe";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }), usePathname: () => "/", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/auth/auth-provider", () => ({ useAuth: () => ({ login: vi.fn(), register: vi.fn(), status: "anonymous" }) }));
vi.mock("@/features/portal/portal-auth-provider", () => ({ usePortalAuth: () => ({ login: vi.fn(), acceptInvite: vi.fn(), status: "anonymous" }), PortalAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
// A plain anchor keeps next/link's prefetch state updates (act warnings) out of the output; axe judges the rendered markup either way.
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
// jsdom has no canvas; axe probes it for an optional check.
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import HomePage from "@/app/(marketing)/page";
import ServicesPage from "@/app/(marketing)/services/page";
import PricingPage from "@/app/(marketing)/pricing/page";
import AboutPage from "@/app/(marketing)/about/page";
import ContactPage from "@/app/(marketing)/contact/page";
import NotFound from "@/app/not-found";
import { LoginForm } from "@/features/auth/login-form";
import { RegisterForm } from "@/features/auth/register-form";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { PortalLoginForm } from "@/features/portal/portal-login-form";
import { AcceptInviteForm } from "@/features/portal/accept-invite-form";
import { PortalAuthCard } from "@/components/client/portal-auth-card";

const qc = () => new QueryClient();
const cases: [string, React.ReactElement][] = [
  ["home page", <HomePage key="h" />],
  ["product page", <ServicesPage key="s" />],
  ["pricing page", <PricingPage key="p" />],
  ["about page", <AboutPage key="a" />],
  ["contact page (form)", <ContactPage key="c" />],
  ["404 page", <NotFound key="n" />],
  ["staff sign-in form", <LoginForm key="l" />],
  ["register form", <RegisterForm key="r" />],
  ["forgot-password form", <ForgotPasswordForm key="f" />],
  ["portal sign-in card", <PortalAuthCard key="pl" title="Sign in to your portal"><PortalLoginForm /></PortalAuthCard>],
  ["portal invitation card", <PortalAuthCard key="pi" title="Welcome aboard"><AcceptInviteForm /></PortalAuthCard>],
];

describe("accessibility smoke test (axe-core, WCAG 2 A/AA)", () => {
  it.each(cases)("%s has no detectable violations", async (_name, ui) => {
    const { container } = render(<QueryClientProvider client={qc()}>{ui}</QueryClientProvider>);
    expect(await a11yViolations(container)).toEqual([]);
  });

  it("the checker itself catches a real problem (an input with no label)", async () => {
    const { container } = render(<form><input type="text" /></form>);
    expect((await a11yViolations(container)).join("\n")).toMatch(/label/);
  });
});
