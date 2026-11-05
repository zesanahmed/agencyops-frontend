import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import type { PortalContact } from "@/types/domain";

let search = ""; let pathname = "/client/projects";
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => pathname, useSearchParams: () => new URLSearchParams(search) }));
const { api, refresh, toast, flag } = vi.hoisted(() => ({
  api: { login: vi.fn(), acceptInvite: vi.fn(), me: vi.fn(), logout: vi.fn(), logoutAll: vi.fn() },
  refresh: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  flag: { has: false, set: vi.fn(), clear: vi.fn() },
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/api/services", () => ({ portalAuthApi: api }));
vi.mock("@/lib/api/portal-client", () => ({ refreshPortalSession: refresh }));
vi.mock("@/lib/auth/session-flag", () => ({ hasPortalSessionFlag: () => flag.has, setPortalSessionFlag: flag.set, clearPortalSessionFlag: flag.clear }));

import { PortalAuthProvider, usePortalAuth } from "./portal-auth-provider";
import { PortalGate } from "./portal-gate";
import { PortalLoginForm } from "./portal-login-form";
import { AcceptInviteForm } from "./accept-invite-form";
import { ApiError } from "@/lib/api/errors";

const contact: PortalContact = { id: "k1", name: "Dana Reyes", email: "client@demo.agencyops.test", jobTitle: null, clientOrganizationName: "Northwind", organizationName: "Brightline Studio" };
const wrap = (ui: React.ReactElement, qc = new QueryClient()) => render(<QueryClientProvider client={qc}><PortalAuthProvider>{ui}</PortalAuthProvider></QueryClientProvider>);

beforeEach(() => {
  search = ""; pathname = "/client/projects"; flag.has = false;
  replace.mockReset(); Object.values(api).forEach((f) => f.mockReset()); refresh.mockReset(); Object.values(toast).forEach((f) => f.mockReset()); flag.set.mockReset(); flag.clear.mockReset();
  usePortalAuthStore.setState({ accessToken: null, contact: null, status: "unknown", signedOut: false });
});

describe("PortalGate + provider", () => {
  it("restores the session from the refresh cookie when the hint exists, then shows the page", async () => {
    flag.has = true; refresh.mockResolvedValue({ kind: "ok", token: "t" }); api.me.mockResolvedValue(contact);
    wrap(<PortalGate><p>secret</p></PortalGate>);
    expect(screen.getByRole("status", { name: "Restoring your session" })).toBeInTheDocument();
    expect(await screen.findByText("secret")).toBeInTheDocument();
    expect(flag.set).toHaveBeenCalled();
  });
  it("without a hint it goes straight to the portal sign-in, remembering where the visitor was headed", async () => {
    wrap(<PortalGate><p>secret</p></PortalGate>);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/client/login?next=%2Fclient%2Fprojects"));
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
  it("a rejected refresh clears the hint and signs out", async () => {
    flag.has = true; refresh.mockResolvedValue({ kind: "rejected" });
    wrap(<PortalGate><p>secret</p></PortalGate>);
    await waitFor(() => expect(flag.clear).toHaveBeenCalled());
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });
  it("an unreachable server is shown as connectivity (not a sign-out) and can retry", async () => {
    flag.has = true; refresh.mockResolvedValueOnce({ kind: "unavailable" }).mockResolvedValueOnce({ kind: "ok", token: "t" }); api.me.mockResolvedValue(contact);
    wrap(<PortalGate><p>secret</p></PortalGate>);
    expect(await screen.findByText("Can't reach the portal right now")).toBeInTheDocument();
    expect(flag.clear).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(await screen.findByText("secret")).toBeInTheDocument();
  });
  it("logout ends the portal session and drops only the portal's cached data", async () => {
    usePortalAuthStore.setState({ contact, status: "authenticated", accessToken: "t" });
    api.logout.mockResolvedValue(undefined);
    const qc = new QueryClient();
    qc.setQueryData(["portal", "projects"], [1]); qc.setQueryData(["organizations", "o1"], [2]);
    function Btn() { const { logout } = usePortalAuth(); return <button onClick={() => void logout()}>out</button>; }
    wrap(<Btn />, qc);
    await userEvent.click(screen.getByText("out"));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/client/login"));
    expect(usePortalAuthStore.getState()).toMatchObject({ status: "anonymous", accessToken: null, contact: null, signedOut: true });
    expect(qc.getQueryData(["portal", "projects"])).toBeUndefined();
    expect(qc.getQueryData(["organizations", "o1"])).toEqual([2]); // a staff session in the same browser keeps its cache
  });
});

describe("PortalLoginForm", () => {
  const fill = async (org = "brightline-studio", email = "client@demo.agencyops.test", pw = "pw") => {
    if (org) await userEvent.type(screen.getByLabelText("Agency"), org);
    if (email) await userEvent.type(screen.getByLabelText("Email"), email);
    if (pw) await userEvent.type(screen.getByLabelText("Password"), pw);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
  };
  it("validates before calling the API", async () => {
    wrap(<PortalLoginForm />);
    await fill("", "nope", "");
    expect(await screen.findByText("Enter your agency's portal name")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Agency"), "bad slug!");
  });
  it("signs in with the agency slug and goes to the overview", async () => {
    api.login.mockResolvedValue({ accessToken: "t", contact });
    wrap(<PortalLoginForm />);
    await fill();
    await waitFor(() => expect(api.login).toHaveBeenCalledWith({ organizationSlug: "brightline-studio", email: "client@demo.agencyops.test", password: "pw" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/client"));
  });
  it("returns to a portal page via ?next, but never to a staff or external path", async () => {
    api.login.mockResolvedValue({ accessToken: "t", contact });
    search = "next=%2Fclient%2Finvoices%2Fi1";
    const { unmount } = wrap(<PortalLoginForm />);
    await fill();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/client/invoices/i1"));
    unmount(); replace.mockReset();
    for (const bad of ["%2Forganizations%2Fo1", "%2F%2Fevil.example", "https%3A%2F%2Fevil.example"]) {
      search = `next=${bad}`;
      const r = wrap(<PortalLoginForm />);
      await fill();
      await waitFor(() => expect(replace).toHaveBeenLastCalledWith("/client"));
      r.unmount();
    }
  });
  it("prefills the agency from ?org= and shows a server error", async () => {
    search = "org=brightline-studio";
    api.login.mockRejectedValue(new ApiError(401, "Invalid email or password"));
    wrap(<PortalLoginForm />);
    expect(screen.getByLabelText("Agency")).toHaveValue("brightline-studio");
    await fill("", "a@b.co", "pw");
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(replace).not.toHaveBeenCalled();
  });
  it("the demo button signs in as the seeded client contact", async () => {
    api.login.mockResolvedValue({ accessToken: "t", contact });
    wrap(<PortalLoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Demo client login" }));
    await waitFor(() => expect(api.login).toHaveBeenCalledWith({ organizationSlug: "brightline-studio", email: "client@demo.agencyops.test", password: "DemoPass123!" }));
  });
});

describe("AcceptInviteForm", () => {
  const TOKEN = "t".repeat(24);
  const fill = async (a: string, b: string) => { await userEvent.type(screen.getByLabelText("Choose a password"), a); await userEvent.type(screen.getByLabelText("Confirm password"), b); await userEvent.click(screen.getByRole("button", { name: "Set password and continue" })); };
  it("explains a missing token", () => {
    wrap(<AcceptInviteForm />);
    expect(screen.getByRole("alert")).toHaveTextContent("needs the link");
  });
  it("applies the password policy and matching before calling the API", async () => {
    search = `token=${TOKEN}`;
    wrap(<AcceptInviteForm />);
    await fill("short", "short");
    expect(await screen.findByText("Password must be at least 8 characters")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Choose a password")); await userEvent.clear(screen.getByLabelText("Confirm password"));
    await fill("password-1", "password-2");
    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument();
    expect(api.acceptInvite).not.toHaveBeenCalled();
  });
  it("sets the password with the URL's token, signs in and opens the portal", async () => {
    search = `token=${TOKEN}`; api.acceptInvite.mockResolvedValue({ accessToken: "t", contact });
    wrap(<AcceptInviteForm />);
    await fill("password-1", "password-1");
    await waitFor(() => expect(api.acceptInvite).toHaveBeenCalledWith({ token: TOKEN, password: "password-1" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/client"));
  });
  it("an expired or used invitation turns into a clear dead end, not a retry loop", async () => {
    search = `token=${TOKEN}`; api.acceptInvite.mockRejectedValue(new ApiError(400, "This invitation is invalid or has expired"));
    wrap(<AcceptInviteForm />);
    await fill("password-1", "password-1");
    expect(await screen.findByText(/invalid, has expired, or was already used/)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
