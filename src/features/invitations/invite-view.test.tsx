import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InviteView } from "./invite-view";
import { ApiError } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/auth-store";

const replace = vi.fn();
let status = "anonymous";
const preview = vi.fn();
const accept = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/features/auth/auth-provider", () => ({ useAuth: () => ({ status }) }));
vi.mock("@/lib/api/services", () => ({ invitationApi: { preview: (...a: unknown[]) => preview(...a), accept: (...a: unknown[]) => accept(...a) } }));

const INV = { organizationName: "Acme Studio", email: "invitee@x.io", role: "MANAGER", expiresAt: "2099-06-01T00:00:00Z" };
const view = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><InviteView token="tok-1" /></QueryClientProvider>);
const signIn = (email: string) => useAuthStore.setState({ user: { id: "u", name: "N", email, avatarUrl: null }, status: "authenticated" });

describe("InviteView", () => {
  beforeEach(() => { replace.mockReset(); preview.mockReset(); accept.mockReset(); preview.mockResolvedValue(INV); });

  it("shows the organization, invited email and role from the preview", async () => {
    status = "anonymous"; view();
    expect(await screen.findByText(/invited to Acme Studio/)).toBeInTheDocument();
    expect(screen.getAllByText(/invitee@x\.io/).length).toBeGreaterThanOrEqual(1); // shown in the subtitle and the sign-in hint
    expect(screen.getByText("Manager")).toBeInTheDocument();
  });

  it("sends anonymous visitors to sign in / register with a return path back to the invite", async () => {
    status = "anonymous"; view();
    const signin = await screen.findByRole("link", { name: "Sign in" });
    expect(signin).toHaveAttribute("href", "/login?next=%2Finvite%2Ftok-1");
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/register?next=%2Finvite%2Ftok-1");
  });

  it("warns instead of offering Accept when signed in with a different email", async () => {
    status = "authenticated"; signIn("someone-else@x.io"); view();
    expect(await screen.findByRole("alert")).toHaveTextContent(/someone-else@x\.io/);
    expect(screen.queryByRole("button", { name: "Accept invitation" })).not.toBeInTheDocument();
  });

  it("compares emails case-insensitively and accepts, then goes to /organizations", async () => {
    status = "authenticated"; signIn("INVITEE@X.IO"); accept.mockResolvedValue(null); view();
    await userEvent.click(await screen.findByRole("button", { name: "Accept invitation" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/organizations"));
    expect(accept).toHaveBeenCalledWith("tok-1");
  });

  it("shows an error state for an invalid, expired or revoked token", async () => {
    status = "anonymous"; preview.mockRejectedValue(new ApiError(404, "Invitation not found or expired"));
    view();
    expect(await screen.findByText("This invitation isn't valid")).toBeInTheDocument();
  });
});
