"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Dashboard = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string) {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ---------------------------------------------------------------------------
// CreateDashboardModal
// ---------------------------------------------------------------------------

function CreateDashboardModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
        return;
      }
      router.push(`/dashboards/${json.data.id}`);
    } catch {
      setError("Failed to create dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <h2 className="mb-4 text-base font-semibold text-zinc-100">
          Create Dashboard
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Dashboard"
              autoFocus
              className="w-full rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-1 focus:ring-blue-500"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardsPage
// ---------------------------------------------------------------------------

export default function DashboardsPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [publishedFilter, setPublishedFilter] = useState<
    "all" | "published" | "draft"
  >("all");
  const [showCreate, setShowCreate] = useState(false);

  const canCreate =
    session?.user.role === "admin" || session?.user.role === "alpha";

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboards"],
    queryFn: async () => {
      const res = await fetch("/api/dashboards?pageSize=100");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data as Dashboard[];
    },
  });

  const filtered = (data ?? []).filter((d) => {
    const matchSearch = d.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchPublished =
      publishedFilter === "all"
        ? true
        : publishedFilter === "published"
          ? d.isPublished
          : !d.isPublished;
    return matchSearch && matchPublished;
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Dashboards</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {data ? `${data.length} dashboard${data.length !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Dashboard
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-3">
        <input
          type="text"
          placeholder="Search dashboards…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-64 rounded bg-zinc-800 px-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="flex rounded border border-zinc-700 text-xs">
          {(["all", "published", "draft"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setPublishedFilter(f)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                publishedFilter === f
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-lg bg-zinc-800/50"
              />
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400">Failed to load dashboards</p>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-zinc-800/50 p-6">
              <svg
                className="h-12 w-12 text-zinc-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
            </div>
            <p className="text-base font-medium text-zinc-300">
              {search || publishedFilter !== "all"
                ? "No dashboards match your filters"
                : "No dashboards yet"}
            </p>
            {!search && publishedFilter === "all" && canCreate && (
              <p className="mt-1 text-sm text-zinc-500">
                Click "Create Dashboard" to get started.
              </p>
            )}
          </div>
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((dashboard) => (
              <Link
                key={dashboard.id}
                href={`/dashboards/${dashboard.id}`}
                className="group flex flex-col rounded-lg border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-800/50"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="font-medium text-zinc-100 group-hover:text-white">
                    {dashboard.name}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      dashboard.isPublished
                        ? "bg-green-900/50 text-green-400"
                        : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {dashboard.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                {dashboard.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-zinc-500">
                    {dashboard.description}
                  </p>
                )}
                <div className="mt-auto text-xs text-zinc-600">
                  Updated {timeAgo(dashboard.updatedAt)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateDashboardModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
