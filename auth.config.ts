import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible NextAuth base configuration.
 *
 * This file MUST NOT import any Node.js-only packages (mysql2, ioredis, bcryptjs, etc.)
 * because it is loaded by middleware.ts, which runs in the Edge Runtime.
 *
 * The full auth config (Credentials provider + DB access) lives in lib/auth.ts
 * and is safe to import only from server-side code (API routes, Server Components).
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },

  session: { strategy: "jwt" },

  callbacks: {
    /**
     * Called by middleware on every matched request.
     * Returning `true` allows the request through; `false` redirects to signIn.
     * For API routes we let NextAuth return a 401 JSON response automatically.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      // NextAuth's own endpoints — always allow.
      if (nextUrl.pathname.startsWith("/api/auth")) return true;

      // All other API routes — require a valid session.
      if (nextUrl.pathname.startsWith("/api/")) return isLoggedIn;

      // Public routes — login page should always be accessible.
      if (nextUrl.pathname === "/login") return true;

      // Everything else (dashboard, sqllab, charts, …) — require auth.
      return isLoggedIn;
    },
  },

  // Providers are added in lib/auth.ts — none here to keep this Edge-safe.
  providers: [],
};
