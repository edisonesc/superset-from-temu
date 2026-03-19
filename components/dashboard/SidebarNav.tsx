"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboards", label: "Dashboards" },
  { href: "/charts", label: "Charts" },
  { href: "/sqllab", label: "SQL Lab" },
  { href: "/datasets", label: "Datasets" },
  { href: "/connections", label: "Connections" },
] as const;

export function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const items = isAdmin
    ? [...NAV_ITEMS, { href: "/admin/users", label: "Users" } as const]
    : NAV_ITEMS;

  return (
    <ul className="space-y-0.5">
      {items.map(({ href, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <li key={href}>
            <Link href={href} className={isActive ? "nav-item-active" : "nav-item"}>
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
