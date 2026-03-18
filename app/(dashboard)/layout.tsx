import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarLogoutButton } from "@/components/dashboard/sidebar-logout-button";

/**
 * Protected dashboard shell layout.
 * Renders the persistent sidebar and wraps all /dashboard/* pages.
 * Redirects to /login if no session is present.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { user } = session;

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
        {/* Brand */}
        <div className="flex h-14 items-center border-b border-zinc-800 px-4">
          <span className="text-sm font-bold tracking-wide text-zinc-100">
            Supaset
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <SidebarNav />
        </nav>

        {/* Footer — user info + logout */}
        <div className="border-t border-zinc-800 p-3">
          <div className="mb-1 px-3">
            <p className="truncate text-sm font-medium text-zinc-200">
              {user.name}
            </p>
            <p className="truncate text-xs text-zinc-500">{user.role}</p>
          </div>
          <SidebarLogoutButton />
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar navigation — server component, no state needed.
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { href: "/dashboards", label: "Dashboards" },
  { href: "/charts", label: "Charts" },
  { href: "/sqllab", label: "SQL Lab" },
  { href: "/datasets", label: "Datasets" },
  { href: "/connections", label: "Connections" },
] as const;

function SidebarNav() {
  return (
    <ul className="space-y-0.5">
      {NAV_ITEMS.map(({ href, label }) => (
        <li key={href}>
          <Link
            href={href}
            className="flex items-center rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
