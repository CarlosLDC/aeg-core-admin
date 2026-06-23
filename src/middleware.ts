import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookieName } from "@/lib/session-cookie";

const SESSION_COOKIE = getSessionCookieName();

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Proxy rewrites /api/* al backend; no debe exigir cookie de sesión del panel.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
