import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return (await import("./oauth-buttons")).OAuthButtons;
}

describe("OAuthButtons", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("renders nothing until a provider is enabled", async () => {
    const OAuthButtons = await load({ NEXT_PUBLIC_OAUTH_PROVIDERS: "" });
    const { container } = render(<OAuthButtons verb="Sign in" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links each enabled provider to the backend start URL through the same-origin proxy (full-page navigation)", async () => {
    const OAuthButtons = await load({ NEXT_PUBLIC_OAUTH_PROVIDERS: "google, GitHub ,facebook" });
    render(<OAuthButtons verb="Sign up" />);
    expect(screen.getByRole("link", { name: /Sign up with Google/ })).toHaveAttribute("href", "/api/v1/auth/oauth/google");
    expect(screen.getByRole("link", { name: /Sign up with GitHub/ })).toHaveAttribute("href", "/api/v1/auth/oauth/github");
    expect(screen.queryByRole("link", { name: /facebook/i })).not.toBeInTheDocument(); // unknown providers are ignored
  });
});
