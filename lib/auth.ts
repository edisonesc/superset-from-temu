import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { authConfig } from "@/auth.config";
import type { UserRole } from "@/types";

// ---------------------------------------------------------------------------
// Module augmentation — extends NextAuth's built-in types with our custom fields.
// ---------------------------------------------------------------------------
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
    };
  }

  interface User {
    role: UserRole;
  }
}

// ---------------------------------------------------------------------------
// NextAuth v5 configuration — server-only (imports DB + bcrypt).
// Do NOT import this file from middleware.ts; use auth.config.ts there instead.
// ---------------------------------------------------------------------------

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * NextAuth.js v5 instance.
 *
 * Exports:
 * - `handlers` — { GET, POST } for the [...nextauth] API route
 * - `auth`     — server-side session accessor (Server Components, Route Handlers)
 * - `signIn`   — server-side sign-in action
 * - `signOut`  — server-side sign-out action
 *
 * For middleware, use `NextAuth(authConfig).auth` from auth.config.ts to
 * avoid pulling Node.js built-ins into the Edge Runtime bundle.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      /**
       * Validates credentials against the users table.
       * Returns the user object on success, null on failure.
       */
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, parsed.data.email))
          .limit(1);

        if (!user) return null;

        const passwordValid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );
        if (!passwordValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    /**
     * Persists custom fields (id, role) into the JWT on sign-in.
     */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role: UserRole }).role;
      }
      return token;
    },

    /**
     * Exposes the custom JWT fields on the client-accessible session object.
     */
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      return session;
    },
  },
});
