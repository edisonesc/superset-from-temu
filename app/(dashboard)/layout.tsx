import Link from "next/link";
import { headers } from "next/headers";
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

  // Resolve current pathname from headers for active link highlighting
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className="flex w-56 flex-shrink-0 flex-col"
        style={{
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--bg-border)",
        }}
      >
        {/* Brand */}
        <div
          className="flex h-14 items-center px-5"
          style={{ borderBottom: "1px solid var(--bg-border)" }}
        >
          <Link
            href="/"
            className="text-sm font-bold tracking-widest uppercase transition-colors"
            style={{ color: "var(--text-primary)", letterSpacing: "0.08em" }}
          >
            <span style={{ color: "var(--accent)" }}>S</span>UPASET
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <SidebarNav pathname={pathname} isAdmin={user.role === "admin"} />
        </nav>

        {/* Footer — user info + logout */}
        <div className="p-3" style={{ borderTop: "1px solid var(--bg-border)" }}>
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {user.name}
            </p>
            <p
              className="truncate text-xs capitalize"
              style={{ color: "var(--text-muted)" }}
            >
              {user.role}
            </p>
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
// Sidebar navigation
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { href: "/dashboards", label: "Dashboards" },
  { href: "/charts", label: "Charts" },
  { href: "/sqllab", label: "SQL Lab" },
  { href: "/datasets", label: "Datasets" },
  { href: "/connections", label: "Connections" },
] as const;

function SidebarNav({ pathname, isAdmin }: { pathname: string; isAdmin: boolean }) {
  const items = isAdmin
    ? [...NAV_ITEMS, { href: "/admin/users", label: "Users" } as const]
    : NAV_ITEMS;

  return (
    <ul className="space-y-0.5">
      {items.map(({ href, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <li key={href}>
            <Link
              href={href}
              className={isActive ? "nav-item-active" : "nav-item"}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
