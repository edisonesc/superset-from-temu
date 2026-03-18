"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

/**
 * Client-side wrapper for NextAuth's SessionProvider.
 * Must be a client component because SessionProvider uses React context.
 * Wrap the root layout's children with this so all client components
 * can access the session via `useSession()`.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
