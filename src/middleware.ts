import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session-token";
import { config as appConfig } from "@/lib/config";

// Protects the admin/mobile UI. The redirect route (`/[slug]`), `/login`, and
// the API routes handle their own auth, so they are excluded via `matcher`.
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(appConfig.cookieName)?.value;

  if (token) {
    try {
      await verifySessionToken(token);
      return NextResponse.next();
    } catch {
      // fall through to redirect
    }
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/links/:path*", "/settings/:path*", "/quick/:path*"],
};
