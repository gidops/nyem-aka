import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Runs on the Next.js server before a page is rendered. (Next.js 16 renamed
// "middleware" to "proxy".) This is a convenience check only: it looks at whether
// a session cookie EXISTS, not whether it is valid, so a signed-out visitor is sent
// to /login without first seeing a flash of a protected page. Real enforcement
// happens in the API, which verifies the token on every request.

const PROTECTED_PREFIXES = ["/dashboard", "/requests", "/officer", "/admin"];
const AUTH_PAGES = ["/login", "/register"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession =
    request.cookies.has("access_token") || request.cookies.has("refresh_token");

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (AUTH_PAGES.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/requests/:path*",
    "/officer/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
