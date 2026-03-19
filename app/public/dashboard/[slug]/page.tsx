"use client";

import { useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PublicChartPanel } from "@/components/dashboard/PublicChartPanel";
import type { FilterContext } from "@/types";
import type { LayoutItem } from "@/stores/dashboard-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PublicDashboard = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  layout: LayoutItem[] | null;
  isPublished: boolean;
};

// ---------------------------------------------------------------------------
// PublicDashboardPage
// ---------------------------------------------------------------------------

/**
 * Public read-only dashboard page. No authentication required.
 * Supports ?embed=true to hide all chrome for iFrame embedding.
 */
export default function PublicDashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "true";

  const [filters, setFilters] = useState<FilterContext>({});

  const handleCrossFilter = useCallback((column: string, value: unknown) => {
    setFilters((prev) => {
      // Toggle: clicking the same value clears that filter
      if (prev[column] === value) {
        const { [column]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [column]: value };
    });
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-dashboard", slug],
    queryFn: async () => {
      const res = await fetch(`/api/dashboards/slug/${slug}`);
      if (res.status === 404) throw new Error("Dashboard not found");
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      return json.data as PublicDashboard;
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const layout = (data?.layout as LayoutItem[]) ?? [];

  // ---------------------------------------------------------------------------
  // States
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg-base)" }}>
        <div
          className="h-5 w-5 animate-spin"
          style={{ borderRadius: "50%", border: "2px solid var(--bg-border)", borderTopColor: "var(--accent)" }}
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center" style={{ background: "var(--bg-base)" }}>
        <p className="text-base font-medium" style={{ color: "var(--text-primary)" }}>Dashboard not found</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          This dashboard may not exist or is not publicly available.
        </p>
      </div>
    );
  }

  const activeFilters = Object.entries(filters).filter(
    ([, v]) => v !== null && v !== undefined,
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
      {/* Header — hidden in embed mode */}
      {!isEmbed && (
        <header
          className="px-6 py-3"
          style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}
        >
          <h1 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{data.name}</h1>
          {data.description && (
            <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>{data.description}</p>
          )}
        </header>
      )}

      {/* Active cross-filter chips — hidden in embed mode */}
      {!isEmbed && activeFilters.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 px-6 py-2"
          style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}
        >
          {activeFilters.map(([col, val]) => (
            <button
              key={col}
              onClick={() => handleCrossFilter(col, val)}
              className="flex items-center gap-1 px-3 py-1 text-xs"
              style={{
                border: "1px solid rgba(32,167,201,0.3)",
                background: "rgba(32,167,201,0.08)",
                color: "var(--accent)",
                borderRadius: "2px",
              }}
            >
              <span className="font-medium">{col}:</span>
              <span>{String(val)}</span>
              <span className="ml-0.5 opacity-70">×</span>
            </button>
          ))}
          <button
            onClick={() => setFilters({})}
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Dashboard grid */}
      <main className="flex-1 overflow-auto p-4">
        {layout.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>This dashboard has no charts.</p>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(12, 1fr)" }}
          >
            {layout.map((item) => (
              <div
                key={item.id}
                style={{
                  gridColumn: `span ${item.colSpan}`,
                  minHeight: `${item.rowSpan * 80}px`,
                }}
              >
                <PublicChartPanel
                  chartId={item.chartId}
                  filters={filters}
                  onCrossFilter={handleCrossFilter}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer — hidden in embed mode */}
      {!isEmbed && (
        <footer
          className="px-6 py-3 text-center text-xs"
          style={{ borderTop: "1px solid var(--bg-border)", color: "var(--text-muted)" }}
        >
          Powered by Supaset
        </footer>
      )}
    </div>
  );
}
