"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

type Dashboard = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function CreateDashboardModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      const json = await res.json();
      if (json.error) { toast.error(json.error); return; }
      toast.success("Dashboard created");
      router.push(`/dashboards/${json.data.id}`);
    } catch {
      toast.error("Failed to create dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md p-6 shadow-lg"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderRadius: "2px" }}
      >
        <h2 className="mb-4 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Create Dashboard
        </h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Dashboard"
              autoFocus
              className="w-full px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--bg-border)",
                color: "var(--text-primary)",
                borderRadius: "2px",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--bg-border)")}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--bg-border)",
                color: "var(--text-primary)",
                borderRadius: "2px",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--bg-border)")}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm transition-colors"
            style={{ color: "var(--text-secondary)", borderRadius: "2px" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "")}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ background: "var(--accent)", borderRadius: "2px" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent-deep)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent)")}
          >
            {loading ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardsPage() {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [publishedFilter, setPublishedFilter] = useState<"all" | "published" | "draft">("all");
  const [showCreate, setShowCreate] = useState(false);

  const canCreate = session?.user.role === "admin" || session?.user.role === "alpha";

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
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchPublished =
      publishedFilter === "all" ? true
      : publishedFilter === "published" ? d.isPublished
      : !d.isPublished;
    return matchSearch && matchPublished;
  });

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--bg-base)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}
      >
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Dashboards</h1>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            {data ? `${data.length} dashboard${data.length !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white transition-colors"
            style={{ background: "var(--accent)", borderRadius: "2px" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent-deep)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent)")}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Dashboard
          </button>
        )}
      </div>

      {/* Filters */}
      <div
        className="flex items-center gap-3 px-6 py-3"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}
      >
        <input
          type="text"
          placeholder="Search dashboards…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-64 px-3 text-sm outline-none"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--bg-border)",
            color: "var(--text-primary)",
            borderRadius: "2px",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--bg-border)")}
        />
        <div
          className="flex text-xs"
          style={{ border: "1px solid var(--bg-border)", borderRadius: "2px" }}
        >
          {(["all", "published", "draft"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setPublishedFilter(f)}
              className="px-3 py-1.5 capitalize transition-colors"
              style={{
                background: publishedFilter === f ? "var(--accent)" : "transparent",
                color: publishedFilter === f ? "#fff" : "var(--text-secondary)",
              }}
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
              <div key={i} className="h-36 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm" style={{ color: "var(--error)" }}>Failed to load dashboards</p>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 p-6" style={{ background: "var(--bg-elevated)", borderRadius: "2px" }}>
              <svg className="h-12 w-12" style={{ color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
            </div>
            <p className="text-base font-medium" style={{ color: "var(--text-primary)" }}>
              {search || publishedFilter !== "all" ? "No dashboards match your filters" : "No dashboards yet"}
            </p>
            {!search && publishedFilter === "all" && canCreate && (
              <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                Click &quot;New Dashboard&quot; to get started.
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
                className="group flex flex-col p-5 transition-colors"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--bg-border)",
                  borderRadius: "2px",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--accent)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--bg-border)")}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <h3 className="font-medium" style={{ color: "var(--text-primary)" }}>
                    {dashboard.name}
                  </h3>
                  <span
                    className="shrink-0 px-2 py-0.5 text-xs font-medium"
                    style={{
                      borderRadius: "2px",
                      background: dashboard.isPublished ? "rgba(22,163,74,0.1)" : "var(--bg-elevated)",
                      color: dashboard.isPublished ? "var(--success)" : "var(--text-muted)",
                      border: `1px solid ${dashboard.isPublished ? "rgba(22,163,74,0.2)" : "var(--bg-border)"}`,
                    }}
                  >
                    {dashboard.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                {dashboard.description && (
                  <p className="mb-3 line-clamp-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {dashboard.description}
                  </p>
                )}
                <div className="mt-auto text-xs" style={{ color: "var(--text-muted)" }}>
                  Updated {timeAgo(dashboard.updatedAt)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateDashboardModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
