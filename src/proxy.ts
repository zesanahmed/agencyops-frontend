import { NextResponse, type NextRequest } from "next/server";

const SESSION_FLAG = "ao_session";
const PORTAL_SESSION_FLAG = "ao_portal_session";
const PORTAL_LOGIN = "/client/login";
const PROTECTED = ["/organizations", "/profile"];
const AUTH_ONLY = ["/login", "/register"];

/**
 * Route-level gate (Next 16 `proxy`, formerly middleware). Refresh tokens live
 * on the API side as an HttpOnly cookie and access tokens only in memory, so the
 * server cannot verify a session here. It uses the non-sensitive session hint
 * for redirects; authorization is enforced by the backend, and role gating is
 * per-organization (roles are not global), handled in <RoleGate/>.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.get(SESSION_FLAG)?.value === "1";

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // The client portal is its own realm with its own hint cookie: a staff session never opens it, and vice versa.
  const hasPortalSession = request.cookies.get(PORTAL_SESSION_FLAG)?.value === "1";
  const inPortal = pathname === "/client" || pathname.startsWith("/client/");
  if (inPortal && pathname !== PORTAL_LOGIN && !hasPortalSession) {
    const url = request.nextUrl.clone();
    url.pathname = PORTAL_LOGIN;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (pathname === PORTAL_LOGIN && hasPortalSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/client";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (AUTH_ONLY.includes(pathname) && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/organizations";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
