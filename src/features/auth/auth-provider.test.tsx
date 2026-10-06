import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./auth-provider";
import { useAuthStore } from "@/stores/auth-store";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function Probe() {
  const { status, user, retry } = useAuth();
  return <><p>{status}:{user?.email ?? "none"}</p><button onClick={() => void retry()}>retry</button></>;
}
const mount = () => render(<QueryClientProvider client={new QueryClient()}><AuthProvider><Probe /></AuthProvider></QueryClientProvider>);

describe("AuthProvider session restore", () => {
  beforeEach(() => { useAuthStore.setState({ accessToken: null, user: null, status: "unknown" }); document.cookie = "ao_session=; Max-Age=0; Path=/"; });
  afterEach(() => vi.restoreAllMocks());

  it("does not hit the network for visitors without a session hint", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    mount();
    await waitFor(() => expect(screen.getByText("anonymous:none")).toBeInTheDocument());
    expect(spy).not.toHaveBeenCalled();
  });

  it("restores the session via refresh + /auth/me when a hint exists", async () => {
    document.cookie = "ao_session=1; Path=/";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).endsWith("/auth/refresh") ? json(200, { data: { accessToken: "tok" } }) : json(200, { success: true, message: "ok", data: { user: { id: "u1", name: "Ada", email: "ada@x.io", avatarUrl: null } } }));
    mount();
    await waitFor(() => expect(screen.getByText("authenticated:ada@x.io")).toBeInTheDocument());
    expect(useAuthStore.getState().accessToken).toBe("tok");
  });

  it("clears a stale hint when refresh is rejected", async () => {
    document.cookie = "ao_session=1; Path=/";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(401, {}));
    mount();
    await waitFor(() => expect(screen.getByText("anonymous:none")).toBeInTheDocument());
    expect(document.cookie).not.toContain("ao_session=1");
  });
  it("keeps the hint and reports 'unavailable' when the backend can't be reached", async () => {
    document.cookie = "ao_session=1; Path=/";
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    mount();
    await waitFor(() => expect(screen.getByText("unavailable:none")).toBeInTheDocument());
    expect(document.cookie).toContain("ao_session=1"); // a transient failure must not end the session
  });

  it("treats a 5xx on refresh as unavailable, not as signed out", async () => {
    document.cookie = "ao_session=1; Path=/";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(503, {}));
    mount();
    await waitFor(() => expect(screen.getByText("unavailable:none")).toBeInTheDocument());
    expect(document.cookie).toContain("ao_session=1");
  });

  it("recovers when retry succeeds after an outage", async () => {
    document.cookie = "ao_session=1; Path=/";
    let down = true;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (down) throw new TypeError("Failed to fetch");
      return String(input).endsWith("/auth/refresh") ? json(200, { data: { accessToken: "tok" } }) : json(200, { success: true, message: "ok", data: { user: { id: "u1", name: "Ada", email: "ada@x.io", avatarUrl: null } } });
    });
    mount();
    await waitFor(() => expect(screen.getByText("unavailable:none")).toBeInTheDocument());
    down = false;
    await userEvent.click(screen.getByRole("button", { name: "retry" }));
    await waitFor(() => expect(screen.getByText("authenticated:ada@x.io")).toBeInTheDocument());
  });
});
