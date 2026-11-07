import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Public routes
        if (
          pathname === "/" ||
          pathname.startsWith("/login") ||
          pathname.startsWith("/signup") ||
          pathname.startsWith("/terms") ||
          pathname.startsWith("/privacy") ||
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/api/image-proxy") ||
          pathname.startsWith("/favicon.ico") ||
          pathname.startsWith("/_next")
        ) {
          return true;
        }

        // Both /chat and /admin require an active session token.
        // If not logged in, redirects to /login?callbackUrl=...
        // For logged-in users, /admin passes through to app/admin/page.tsx,
        // which renders AccessDenied for role !== 'admin' and AdminClient for role === 'admin'.
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/chat/:path*", "/admin/:path*"],
};
