// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, proxy } from "./proxy";

const req = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost:3000${path}`, cookie ? { headers: { cookie } } : undefined);
const location = (res: Response) => res.headers.get("location");

describe("proxy route gate", () => {
  it("redirects anonymous visitors from protected routes to /login with a return path", () => {
    const res = proxy(req("/organizations/o1/projects?status=ACTIVE&page=2"));
    expect(res.status).toBe(307);
    const url = new URL(location(res)!);
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("next")).toBe("/organizations/o1/projects?status=ACTIVE&page=2");
  });

  it("gates /organizations and /profile themselves, not just nested paths", () => {
    expect(proxy(req("/organizations")).status).toBe(307);
    expect(proxy(req("/profile")).status).toBe(307);
  });

  it("does not match look-alike paths (prefix safety)", () => {
    expect(proxy(req("/organizations-info")).headers.get("location")).toBeNull();
    expect(proxy(req("/profiles")).headers.get("location")).toBeNull();
  });

  it("lets visitors with the session hint into protected routes", () => {
    expect(proxy(req("/organizations", "ao_session=1")).headers.get("location")).toBeNull();
  });

  it("ignores a hint cookie with any other value", () => {
    expect(proxy(req("/organizations", "ao_session=0")).status).toBe(307);
    expect(proxy(req("/organizations", "ao_session=true")).status).toBe(307);
  });

  it("sends signed-in visitors away from /login and /register", () => {
    for (const p of ["/login", "/register"]) {
      const res = proxy(req(p, "ao_session=1"));
      expect(new URL(location(res)!).pathname).toBe("/organizations");
    }
  });

  it("leaves public routes and invitation links open to everyone", () => {
    for (const p of ["/", "/about", "/services", "/pricing", "/contact", "/login", "/register", "/invite/abc123", "/payment/success", "/client"])
      expect(proxy(req(p)).headers.get("location")).toBeNull();
  });

  it("excludes API proxy, static assets and files from the matcher", () => {
    const re = new RegExp(`^${config.matcher[0]}$`);
    expect(re.test("/organizations")).toBe(true);
    expect(re.test("/api/v1/auth/me")).toBe(false);
    expect(re.test("/_next/static/chunk.js")).toBe(false);
    expect(re.test("/favicon.ico")).toBe(false);
    expect(re.test("/robots.txt")).toBe(false);
  });
});
