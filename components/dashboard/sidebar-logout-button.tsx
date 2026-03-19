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
      className="w-full px-3 py-2 text-left text-xs font-medium transition-colors"
      style={{
        color: "var(--text-muted)",
        borderRadius: "2px",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--error)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
      }}
    >
      Sign out
    </button>
  );
}
