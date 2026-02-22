/*
 * Edge middleware for route protection.
 * Redirects unauthenticated users to /login.
 * Allows public access to: login page, auth API routes,
 * webhook endpoints (Stripe/Tally authenticate via their own secrets),
 * and static/PWA assets.
 */
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!login|api/auth|api/webhooks|api/validate|api/cron|_next|icons|manifest\\.json|sw\\.js|favicon\\.ico).*)",
  ],
};
