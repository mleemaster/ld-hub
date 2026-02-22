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
  if (req.auth) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/openclaw")) {
    const apiKey = req.headers.get("x-api-key");
    if (apiKey === process.env.OPENCLAW_API_KEY) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: [
    "/((?!login|api/auth|api/webhooks|api/validate|api/cron|_next|icons|manifest\\.json|sw\\.js|favicon\\.ico).*)",
  ],
};
