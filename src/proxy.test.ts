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
    for (const p of ["/", "/about", "/services", "/pricing", "/contact", "/login", "/register", "/invite/abc123", "/payment/success", "/client/login", "/portal/accept-invite", "/invitations/accept"])
      expect(proxy(req(p)).headers.get("location")).toBeNull();
  });

  describe("client portal (its own realm, its own hint cookie)", () => {
    it("sends anonymous visitors to /client/login with a return path", () => {
      for (const p of ["/client", "/client/projects", "/client/projects/p1?tab=tasks", "/client/invoices"]) {
        const res = proxy(req(p));
        expect(res.status).toBe(307);
        const url = new URL(location(res)!);
        expect(url.pathname).toBe("/client/login");
        expect(url.searchParams.get("next")).toBe(p);
      }
    });
    it("a staff session does not open the portal, and a portal session does not open the staff app", () => {
      expect(new URL(location(proxy(req("/client", "ao_session=1")))!).pathname).toBe("/client/login");
      expect(new URL(location(proxy(req("/organizations", "ao_portal_session=1")))!).pathname).toBe("/login");
    });
    it("lets a portal session in and bounces it off the portal sign-in", () => {
      expect(proxy(req("/client/projects", "ao_portal_session=1")).headers.get("location")).toBeNull();
      expect(new URL(location(proxy(req("/client/login", "ao_portal_session=1")))!).pathname).toBe("/client");
    });
    it("does not match look-alike paths", () => {
      expect(proxy(req("/clients-info")).headers.get("location")).toBeNull();
      expect(proxy(req("/clientele")).headers.get("location")).toBeNull();
    });
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
