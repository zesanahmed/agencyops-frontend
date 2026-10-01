import { NextResponse, type NextRequest } from "next/server";

const SESSION_FLAG = "ao_session";
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
