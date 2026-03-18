"use client";

import { signOut } from "next-auth/react";

/**
 * Client-side logout button for the dashboard sidebar.
 * Isolated as a client component so the parent layout stays a Server Component.
 */
export function SidebarLogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
    >
      Sign out
    </button>
  );
}
