import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";

let search = "";
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), useSearchParams: () => new URLSearchParams(search) }));
const logout = vi.fn(); const refreshUser = vi.fn(); const completeOAuth = vi.fn();
let authStatus = "anonymous";
vi.mock("./auth-provider", () => ({ useAuth: () => ({ logout, refreshUser, completeOAuth, status: authStatus }) }));
const { toast, api } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  api: { forgotPassword: vi.fn(), resetPassword: vi.fn(), verifyEmail: vi.fn(), changePassword: vi.fn(), deleteAccount: vi.fn(), resendVerification: vi.fn(), me: vi.fn(), sessions: vi.fn(), revokeSession: vi.fn() },
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/lib/api/services", () => ({ authApi: api }));

import { ForgotPasswordForm } from "./forgot-password-form";
import { ResetPasswordForm } from "./reset-password-form";
import { VerifyEmailView } from "./verify-email-view";
import { OAuthCallbackView, oauthErrorMessage } from "./oauth-callback-view";
import { ChangePasswordForm } from "./change-password-form";
import { DeleteAccountDialog } from "./delete-account-dialog";
import { SessionsPanel } from "./sessions-panel";
import { VerifyEmailBanner } from "./verify-email-banner";
import { useAuthStore } from "@/stores/auth-store";

const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const apiErr = (status: number, message: string, details?: unknown) => new ApiError(status, message, undefined, details);

beforeEach(() => { search = ""; authStatus = "anonymous"; replace.mockReset(); logout.mockReset().mockResolvedValue(undefined); refreshUser.mockReset().mockResolvedValue(undefined); completeOAuth.mockReset(); Object.values(api).forEach((f) => f.mockReset()); Object.values(toast).forEach((f) => f.mockReset()); });

describe("ForgotPasswordForm", () => {
  it("validates, then shows a non-committal confirmation (the backend answers the same for unknown addresses)", async () => {
    api.forgotPassword.mockResolvedValue(undefined);
    render(<ForgotPasswordForm />);
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(api.forgotPassword).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Email"), "ada@x.io");
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText(/If an account exists for/)).toBeInTheDocument();
    expect(api.forgotPassword).toHaveBeenCalledWith("ada@x.io");
  });
  it("shows the server error and stays on the form (e.g. rate limit)", async () => {
    api.forgotPassword.mockRejectedValue(apiErr(429, "Too many requests. Please slow down and retry shortly."));
    render(<ForgotPasswordForm />);
    await userEvent.type(screen.getByLabelText("Email"), "ada@x.io");
    await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many requests");
  });
});

describe("ResetPasswordForm", () => {
  const fill = async (a: string, b: string) => { await userEvent.type(screen.getByLabelText("New password"), a); await userEvent.type(screen.getByLabelText("Confirm new password"), b); await userEvent.click(screen.getByRole("button", { name: "Reset password" })); };
  it("without a token it explains and offers a new link", () => {
    render(<ResetPasswordForm />);
    expect(screen.getByRole("alert")).toHaveTextContent("needs the link");
    expect(screen.getByRole("link", { name: "Request a new link" })).toHaveAttribute("href", "/forgot-password");
  });
  it("rejects mismatched passwords locally", async () => {
    search = "token=tok-1234567890abcdef";
    render(<ResetPasswordForm />);
    await fill("password-1", "password-2");
    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument();
    expect(api.resetPassword).not.toHaveBeenCalled();
  });
  it("resets with the token from the URL and sends the user to sign in", async () => {
    search = "token=tok-1234567890abcdef"; api.resetPassword.mockResolvedValue(undefined);
    render(<ResetPasswordForm />);
    await fill("password-1", "password-1");
    await waitFor(() => expect(api.resetPassword).toHaveBeenCalledWith("tok-1234567890abcdef", "password-1"));
    expect(replace).toHaveBeenCalledWith("/login");
  });
  it("turns a used/expired token into a request-a-new-link state", async () => {
    search = "token=tok-1234567890abcdef"; api.resetPassword.mockRejectedValue(apiErr(400, "This link is invalid or has expired"));
    render(<ResetPasswordForm />);
    await fill("password-1", "password-1");
    expect(await screen.findByText("This reset link is invalid or has expired.")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
  it("maps a backend password-policy error onto the field", async () => {
    search = "token=tok-1234567890abcdef"; api.resetPassword.mockRejectedValue(apiErr(400, "Validation failed", [{ path: "password", message: "Password is too long" }]));
    render(<ResetPasswordForm />);
    await fill("password-1", "password-1");
    expect(await screen.findByText("Password is too long")).toBeInTheDocument();
  });
});

describe("VerifyEmailView", () => {
  it("spends the one-time token exactly once and refreshes the user", async () => {
    search = "token=tok-1234567890abcdef"; authStatus = "authenticated"; api.verifyEmail.mockResolvedValue(undefined);
    const { rerender } = render(<VerifyEmailView />);
    expect(await screen.findByText("E-mail verified")).toBeInTheDocument();
    rerender(<VerifyEmailView />);
    expect(api.verifyEmail).toHaveBeenCalledTimes(1);
    expect(refreshUser).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Continue to AgencyOps" })).toHaveAttribute("href", "/organizations");
  });
  it("signed-out users are sent to sign in", async () => {
    search = "token=tok-1234567890abcdef"; api.verifyEmail.mockResolvedValue(undefined);
    render(<VerifyEmailView />);
    expect(await screen.findByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });
  it("reports an invalid or expired link, and a missing token", async () => {
    search = "token=tok-1234567890abcdef"; api.verifyEmail.mockRejectedValue(apiErr(400, "This link is invalid or has expired"));
    const { unmount } = render(<VerifyEmailView />);
    expect(await screen.findByText("This verification link is invalid or has expired.")).toBeInTheDocument();
    unmount();
    search = "";
    render(<VerifyEmailView />);
    expect(screen.getByText(/needs the link/)).toBeInTheDocument();
    expect(api.verifyEmail).toHaveBeenCalledTimes(1);
  });
});

describe("OAuthCallbackView", () => {
  it("completes the sign-in once and goes to the organizations", async () => {
    search = "provider=google"; completeOAuth.mockResolvedValue(true);
    const { rerender } = render(<OAuthCallbackView />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/organizations"));
    rerender(<OAuthCallbackView />);
    expect(completeOAuth).toHaveBeenCalledTimes(1);
  });
  it("shows a human message for each backend error code and never calls the API", () => {
    search = "error=email_not_verified";
    render(<OAuthCallbackView />);
    expect(screen.getByRole("alert")).toHaveTextContent("no verified e-mail");
    expect(completeOAuth).not.toHaveBeenCalled();
    expect(oauthErrorMessage("access_denied")).toMatch(/cancelled/);
    expect(oauthErrorMessage("something_new")).toBe(oauthErrorMessage("oauth_failed"));
  });
  it("falls back to an error when no session came out of the round-trip", async () => {
    search = "provider=github"; completeOAuth.mockResolvedValue(false);
    render(<OAuthCallbackView />);
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't complete");
  });
});

describe("ChangePasswordForm", () => {
  it("changes the password, then signs out (the backend revoked every session)", async () => {
    api.changePassword.mockResolvedValue(undefined);
    render(<ChangePasswordForm />);
    await userEvent.type(screen.getByLabelText("Current password"), "old-password");
    await userEvent.type(screen.getByLabelText("New password"), "new-password-1");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "new-password-1");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() => expect(api.changePassword).toHaveBeenCalledWith("old-password", "new-password-1"));
    await waitFor(() => expect(logout).toHaveBeenCalled());
  });
  it("shows a wrong current password from the server and stays signed in", async () => {
    api.changePassword.mockRejectedValue(apiErr(400, "Current password is incorrect"));
    render(<ChangePasswordForm />);
    await userEvent.type(screen.getByLabelText("Current password"), "wrong-password");
    await userEvent.type(screen.getByLabelText("New password"), "new-password-1");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "new-password-1");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Current password is incorrect");
    expect(logout).not.toHaveBeenCalled();
  });
});

describe("DeleteAccountDialog", () => {
  const open = () => render(<DeleteAccountDialog open onOpenChange={vi.fn()} />);
  it("requires the typed confirmation before calling the API", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));
    expect(await screen.findByText("Type DELETE in capitals to continue")).toBeInTheDocument();
    expect(api.deleteAccount).not.toHaveBeenCalled();
  });
  it("deletes (password optional) and signs out", async () => {
    api.deleteAccount.mockResolvedValue(undefined);
    open();
    await userEvent.type(screen.getByLabelText("Password"), "my-password");
    await userEvent.type(screen.getByLabelText(/Type DELETE/), "DELETE");
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));
    await waitFor(() => expect(api.deleteAccount).toHaveBeenCalledWith("my-password"));
    await waitFor(() => expect(logout).toHaveBeenCalled());
  });
  it("sends no password for OAuth-only accounts", async () => {
    api.deleteAccount.mockResolvedValue(undefined);
    open();
    await userEvent.type(screen.getByLabelText(/Type DELETE/), "DELETE");
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));
    await waitFor(() => expect(api.deleteAccount).toHaveBeenCalledWith(undefined));
  });
  it("keeps the dialog open and shows why when the user still owns an organization (409)", async () => {
    api.deleteAccount.mockRejectedValue(apiErr(409, 'You still own the organization "Acme". Delete it or transfer ownership before deleting your account.'));
    open();
    await userEvent.type(screen.getByLabelText(/Type DELETE/), "DELETE");
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent('You still own the organization "Acme"');
    expect(logout).not.toHaveBeenCalled();
  });
});

describe("SessionsPanel", () => {
  const sess = (o: object) => ({ id: "s", userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537", ipAddress: "1.2.3.4", createdAt: new Date().toISOString(), lastUsedAt: null, expiresAt: "", current: false, ...o });
  it("labels this device, offers sign-out only for the others, and revokes by id", async () => {
    api.sessions.mockResolvedValue([sess({ id: "a", current: true }), sess({ id: "b", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Version/17 Safari/605" })]);
    api.revokeSession.mockResolvedValue(undefined);
    wrap(<SessionsPanel />);
    expect(await screen.findByText("This device")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Sign out Safari on macOS" }));
    await waitFor(() => expect(api.revokeSession.mock.calls[0][0]).toBe("b"));
  });
  it("shows an error state with retry", async () => {
    api.sessions.mockRejectedValue(new Error("boom"));
    wrap(<SessionsPanel />);
    expect(await screen.findByText("Couldn't load your sessions")).toBeInTheDocument();
  });
});

describe("VerifyEmailBanner", () => {
  const user = { id: "u", name: "Ada", email: "ada@x.io", avatarUrl: null };
  it("appears only when the server says the address is unverified", () => {
    useAuthStore.setState({ user: { ...user, emailVerifiedAt: "2026-10-01T00:00:00Z" } });
    const { container, unmount } = render(<VerifyEmailBanner />);
    expect(container).toBeEmptyDOMElement(); unmount();
    useAuthStore.setState({ user }); // field absent: never nag on a partial payload
    const second = render(<VerifyEmailBanner />);
    expect(second.container).toBeEmptyDOMElement(); second.unmount();
    useAuthStore.setState({ user: { ...user, emailVerifiedAt: null } });
    render(<VerifyEmailBanner />);
    expect(screen.getByRole("region", { name: "Verify your e-mail" })).toHaveTextContent("ada@x.io");
  });
  it("resends and confirms", async () => {
    useAuthStore.setState({ user: { ...user, emailVerifiedAt: null } }); api.resendVerification.mockResolvedValue(true);
    render(<VerifyEmailBanner />);
    await userEvent.click(screen.getByRole("button", { name: "Resend e-mail" }));
    expect(await screen.findByText("Check your inbox.")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalled();
  });
});
