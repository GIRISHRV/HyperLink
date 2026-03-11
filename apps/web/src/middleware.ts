import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * SEC-001: Server-side auth enforcement for protected routes.
 * Previously, only the client-side useRequireAuth hook redirected
 * unauthenticated users — the server still served the page HTML.
 */
// SEC-009: Added /admin to server-side protected paths so the admin dashboard
// is guarded at the edge, not just via client-side useRequireAuth hooks.
const PROTECTED_PATHS = ["/dashboard", "/history", "/settings", "/send", "/receive", "/admin"];

export async function middleware(request: NextRequest) {
  // Intercept POST requests to paths that might be used by the PWA Share Target
  // this prevents 405 errors caused by conflicts with page routes.
  if (request.method === "POST") {
    const { pathname } = request.nextUrl;

    if (pathname === "/send" || pathname === "/api/share-target") {
      return NextResponse.redirect(new URL("/send?shared=middleware_bypass", request.url), 303);
    }
  }

  // Check if path needs auth protection
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  if (!isProtected) return NextResponse.next();

  // Server-side Supabase auth check
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/send/:path*",
    "/api/share-target",
    "/dashboard/:path*",
    "/history/:path*",
    "/settings/:path*",
    "/receive/:path*",
    "/admin/:path*", // A4 fix: SEC-009 added /admin to PROTECTED_PATHS but forgot to add it to the matcher
  ],
};
