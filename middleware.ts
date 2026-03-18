import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Auth middleware — uses the Edge-compatible `authConfig` (no DB/Redis imports).
 *
 * Route protection is handled by the `authorized` callback in auth.config.ts:
 *  - /api/auth/*  → always allowed
 *  - /api/*       → 401 if unauthenticated
 *  - /login       → always allowed
 *  - everything else → redirect to /login if unauthenticated
 */
export default NextAuth(authConfig).auth;

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
