import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

/**
 * Auth middleware — uses the Edge-compatible `authConfig` (no DB/Redis imports).
 * Also injects the current pathname as the `x-pathname` header so server
 * components (e.g. the dashboard layout) can highlight the active nav link.
 *
 * Route protection is handled by the `authorized` callback in auth.config.ts:
 *  - /api/auth/*  → always allowed
 *  - /api/*       → 401 if unauthenticated
 *  - /login       → always allowed
 *  - everything else → redirect to /login if unauthenticated
 */
export default auth((req: NextRequest & { auth: unknown }) => {
  const res = NextResponse.next();
  res.headers.set("x-pathname", req.nextUrl.pathname);
  return res;
});

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
