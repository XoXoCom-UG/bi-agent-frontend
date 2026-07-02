import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route protection (Next.js 16 "Proxy", formerly Middleware).
 *
 * Optimistic check: Supabase (@supabase/ssr) stores the session in cookies
 * named `sb-<project-ref>-auth-token`. If no such cookie exists, the user is
 * definitely not logged in — redirect to /login before the page even renders.
 *
 * This is defense-in-depth / UX only. Real authorization happens on the
 * backend: every API call is validated against the Bearer token server-side.
 */
const PROTECTED_PREFIXES = ["/chat", "/concept", "/dashboard"];

function hasSupabaseSession(req: NextRequest): boolean {
  return req.cookies
    .getAll()
    .some(c => c.name.startsWith("sb-") && c.name.includes("-auth-token") && c.value.length > 0);
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = hasSupabaseSession(req);

  // Not logged in → block app pages
  if (!authed && PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Already logged in → skip the login page
  if (authed && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/chat";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/chat/:path*", "/concept/:path*", "/dashboard/:path*", "/login"],
};
