import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const login = vi.fn();
const replace = vi.fn();
let nextParam: string | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => ({ get: (k: string) => (k === "next" ? nextParam : null) }),
}));
vi.mock("./auth-provider", () => ({ useAuth: () => ({ login }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

async function loadForm(env: Record<string, string> = {}) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return (await import("./login-form")).LoginForm;
}

describe("LoginForm", () => {
  beforeEach(() => { login.mockReset(); replace.mockReset(); nextParam = null; });
  afterEach(() => vi.unstubAllEnvs());

  it("validates before calling the API", async () => {
    const LoginForm = await loadForm();
    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("signs in and redirects to a safe next path", async () => {
    login.mockResolvedValue({});
    nextParam = "/organizations/o1/projects";
    const LoginForm = await loadForm();
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "a@b.co");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/organizations/o1/projects"));
  });

  it("refuses open-redirect targets", async () => {
    login.mockResolvedValue({});
    nextParam = "//evil.example";
    const LoginForm = await loadForm();
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "a@b.co");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/organizations"));
  });

  it("disables demo buttons until configured, and logs in with configured credentials", async () => {
    const Unconfigured = await loadForm();
    const { unmount } = render(<Unconfigured />);
    for (const b of screen.getAllByRole("button", { name: "Demo login" })) expect(b).toBeDisabled();
    unmount();

    login.mockResolvedValue({});
    const LoginForm = await loadForm({ NEXT_PUBLIC_DEMO_OWNER_EMAIL: "owner@demo.test", NEXT_PUBLIC_DEMO_OWNER_PASSWORD: "pw-owner-1" });
    render(<LoginForm />);
    await userEvent.click(screen.getAllByRole("button", { name: "Demo login" })[0]);
    await waitFor(() => expect(login).toHaveBeenCalledWith({ email: "owner@demo.test", password: "pw-owner-1" }));
  });

  it("shows the server error message on failure", async () => {
    login.mockRejectedValue(new Error("boom"));
    const LoginForm = await loadForm();
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "a@b.co");
    await userEvent.type(screen.getByLabelText("Password"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
