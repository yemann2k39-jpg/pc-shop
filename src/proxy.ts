import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE, verifySessionToken } from "@/lib/auth";

/**
 * Next 16 proxy (formerly middleware): guards every /admin route except the
 * login page. Unauthenticated visitors are redirected to the login page,
 * preserving the originally requested path for post-login navigation.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin/login") {
    // Already signed in? Skip the login form.
    if (await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!(await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value))) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
