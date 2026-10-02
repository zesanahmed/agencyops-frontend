import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthGate } from "./auth-gate";
import { useAuthStore } from "@/stores/auth-store";

const replace = vi.fn();
const retry = vi.fn();
let status = "authenticated";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => "/organizations/o1" }));
vi.mock("./auth-provider", () => ({ useAuth: () => ({ status, retry }) }));

describe("AuthGate", () => {
  beforeEach(() => { replace.mockReset(); retry.mockReset(); useAuthStore.setState({ signedOut: false }); });

  it("renders children when authenticated", () => {
    status = "authenticated";
    render(<AuthGate><p>secret</p></AuthGate>);
    expect(screen.getByText("secret")).toBeInTheDocument();
  });

  it("redirects anonymous visitors to /login with a return path", () => {
    status = "anonymous";
    render(<AuthGate><p>secret</p></AuthGate>);
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/login?next=%2Forganizations%2Fo1");
  });

  it("uses a plain /login after an explicit sign-out", () => {
    status = "anonymous";
    useAuthStore.setState({ signedOut: true });
    render(<AuthGate><p>secret</p></AuthGate>);
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("shows a retry state, and does NOT redirect, when the server is unreachable", async () => {
    status = "unavailable";
    render(<AuthGate><p>secret</p></AuthGate>);
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
