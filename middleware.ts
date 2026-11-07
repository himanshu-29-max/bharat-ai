import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Check admin routes
    if (pathname.startsWith("/admin")) {
      const role = token?.role;
      if (role !== "admin") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

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
          pathname.startsWith("/api/auth") ||
          pathname.startsWith("/api/image-proxy") ||
          pathname.startsWith("/favicon.ico") ||
          pathname.startsWith("/_next")
        ) {
          return true;
        }

        // All /chat/* and /admin/* require an active token
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
