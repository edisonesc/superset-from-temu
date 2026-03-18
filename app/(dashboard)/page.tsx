import { auth } from "@/lib/auth";

/**
 * Dashboard home / overview page.
 * Shown after sign-in when no specific section is selected.
 */
export default async function DashboardHome() {
  const session = await auth();
  const name = session?.user?.name ?? "there";

  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-bold text-zinc-100">
        Welcome back, {name}
      </h1>
      <p className="text-sm text-zinc-500">
        Select a section from the sidebar to get started.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "Dashboards",
            href: "/dashboards",
            description: "Build and share interactive dashboards.",
          },
          {
            title: "Charts",
            href: "/charts",
            description: "Create visualisations from your datasets.",
          },
          {
            title: "SQL Lab",
            href: "/sqllab",
            description: "Write and run SQL queries against your connections.",
          },
          {
            title: "Datasets",
            href: "/datasets",
            description: "Manage logical datasets backed by your databases.",
          },
          {
            title: "Connections",
            href: "/connections",
            description: "Configure connections to external data sources.",
          },
        ].map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="group rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-zinc-700 hover:bg-zinc-800"
          >
            <h2 className="mb-1 font-semibold text-zinc-100 group-hover:text-white">
              {card.title}
            </h2>
            <p className="text-sm text-zinc-500">{card.description}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
