import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookieName } from "@/lib/session-cookie";
import {
  ACTIVITY_COOKIE_NAME,
  TOTAL_INACTIVITY_TIMEOUT_MS,
} from "@/lib/inactivity-timeout";

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

  const lastActivityCookie = request.cookies.get(ACTIVITY_COOKIE_NAME)?.value;
  if (lastActivityCookie) {
    const lastActivity = Number(lastActivityCookie);
    if (Number.isFinite(lastActivity) && lastActivity > 0) {
      const elapsed = Date.now() - lastActivity;
      if (elapsed >= TOTAL_INACTIVITY_TIMEOUT_MS) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("reason", "inactivity");
        loginUrl.searchParams.set("redirect", pathname);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete(SESSION_COOKIE);
        response.cookies.delete(ACTIVITY_COOKIE_NAME);
        return response;
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
