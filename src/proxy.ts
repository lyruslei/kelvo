import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/auth";

// Optimistic redirect to /login. Pages and actions still call requireSession() themselves.
export function proxy(request: NextRequest) {
  const loggedIn = verifyToken(request.cookies.get(SESSION_COOKIE)?.value, process.env.TOKEN_SECRET, Date.now());
  const onLogin = request.nextUrl.pathname === "/login";

  if (!loggedIn && !onLogin) return NextResponse.redirect(new URL("/login", request.url));
  if (loggedIn && onLogin) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
