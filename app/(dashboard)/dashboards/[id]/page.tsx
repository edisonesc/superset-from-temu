"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useDashboardStore } from "@/stores/dashboard-store";
import { useFilterStore } from "@/stores/filterStore";
import { DashboardCanvas } from "@/components/dashboard/DashboardCanvas";
import { FilterBar } from "@/components/filters/FilterBar";
import type { FilterConfig } from "@/stores/filterStore";

export default function DashboardViewerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();

  const {
    dashboard, tabs, activeTabId, filters, isEditMode, isDirty,
    loadDashboard, setEditMode, setFilter, clearFilter,
    saveDashboard, publishDashboard, reset,
  } = useDashboardStore();

  // Compute active layout for the filter config chart list
  const activeLayout = tabs.find((t) => t.id === activeTabId)?.layout ?? [];

  const loadFilterConfigs = useFilterStore((s) => s.loadConfigs);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit = session?.user.role === "admin" || session?.user.role === "alpha";

  useEffect(() => {
    setLoading(true);
    loadDashboard(id)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
    return () => reset();
  }, [id, loadDashboard, reset]);

  // Load filter configs from the API after dashboard is loaded
  useEffect(() => {
    if (!id) return;
    fetch(`/api/dashboards/${id}/filters`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.error) {
          loadFilterConfigs(id, (json.data ?? []) as FilterConfig[]);
        }
      })
      .catch(() => {});
  }, [id, loadFilterConfigs]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (isDirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && isEditMode) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveDashboard();
      setEditMode(false);
      toast.success("Dashboard saved");
    }
    catch (err) { toast.error(err instanceof Error ? err.message : "Save failed"); }
    finally { setSaving(false); }
  }, [saveDashboard, setEditMode]);

  const handleDiscard = useCallback(() => {
    if (isDirty && !confirm("Discard unsaved changes?")) return;
    setEditMode(false);
    loadDashboard(id).catch(() => {});
  }, [isDirty, setEditMode, loadDashboard, id]);

  const handlePublish = useCallback(async () => {
    try {
      const wasPublished = dashboard?.isPublished;
      await publishDashboard();
      toast.success(wasPublished ? "Unpublished" : "Dashboard published");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Publish failed"); }
  }, [publishDashboard, dashboard?.isPublished]);

  const handleCrossFilter = useCallback(
    (column: string, value: unknown) => {
      if (filters[column] === value) clearFilter(column);
      else setFilter(column, value);
    },
    [filters, setFilter, clearFilter],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div
          className="h-5 w-5 animate-spin"
          style={{ borderRadius: "50%", border: "2px solid var(--bg-border)", borderTopColor: "var(--accent)" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>
        <button
          onClick={() => router.back()}
          className="px-3 py-1.5 text-sm transition-colors"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", color: "var(--text-secondary)", borderRadius: "2px" }}
        >
          Go back
        </button>
      </div>
    );
  }

  if (!dashboard) return null;

  // Extract chart options from active layout for use in filter config modal
  const dashboardCharts = activeLayout
    .filter((item) => item.type !== "markdown" && item.chartId)
    .map((item) => ({
      id: item.chartId,
      name: item.chartId, // name resolved inside ChartPanel — use chartId as fallback
    }));

  return (
    <div className="flex h-full flex-col" style={{ background: "var(--bg-base)" }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}
      >
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            {dashboard.name}
          </h1>
          {dashboard.description && (
            <p className="truncate text-sm" style={{ color: "var(--text-muted)" }}>
              {dashboard.description}
            </p>
          )}
        </div>

        <div className="ml-4 flex items-center gap-2">
          {dashboard.isPublished && !isEditMode && (
            <a
              href={`/public/dashboard/${dashboard.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                background: "rgba(22,163,74,0.1)",
                color: "var(--success)",
                border: "1px solid rgba(22,163,74,0.2)",
                borderRadius: "2px",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--success)" }} />
              Published
            </a>
          )}

          {isEditMode ? (
            <>
              <button
                onClick={handlePublish}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: dashboard.isPublished ? "var(--bg-elevated)" : "rgba(22,163,74,0.1)",
                  color: dashboard.isPublished ? "var(--text-secondary)" : "var(--success)",
                  border: `1px solid ${dashboard.isPublished ? "var(--bg-border)" : "rgba(22,163,74,0.25)"}`,
                  borderRadius: "2px",
                }}
              >
                {dashboard.isPublished ? "Unpublish" : "Publish"}
              </button>
              <button
                onClick={handleDiscard}
                className="px-3 py-1.5 text-xs transition-colors"
                style={{ color: "var(--text-secondary)", borderRadius: "2px" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "")}
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
                style={{ background: "var(--accent)", borderRadius: "2px" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent-deep)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent)")}
              >
                {saving ? "Saving…" : isDirty ? "Save*" : "Save"}
              </button>
            </>
          ) : (
            canEdit && (
              <button
                onClick={() => setEditMode(true)}
                className="px-3 py-1.5 text-xs transition-colors"
                style={{
                  border: "1px solid var(--bg-border)",
                  color: "var(--text-secondary)",
                  borderRadius: "2px",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--bg-border)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
                }}
              >
                Edit
              </button>
            )
          )}
        </div>
      </div>

      <FilterBar
        dashboardId={id}
        isEditMode={isEditMode}
        dashboardCharts={dashboardCharts}
      />

      <DashboardCanvas
        isEditMode={isEditMode}
        filters={filters}
        dashboardId={id}
        onCrossFilter={handleCrossFilter}
      />
    </div>
  );
}
