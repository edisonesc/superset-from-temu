"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useDashboardStore } from "@/stores/dashboard-store";
import { DashboardCanvas } from "@/components/dashboard/DashboardCanvas";
import { FilterBar } from "@/components/dashboard/FilterBar";
import type { FilterConfigItem } from "@/stores/dashboard-store";

// ---------------------------------------------------------------------------
// DashboardViewerPage
// ---------------------------------------------------------------------------

export default function DashboardViewerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();

  const {
    dashboard,
    layout,
    filters,
    isEditMode,
    isDirty,
    loadDashboard,
    setEditMode,
    setFilter,
    clearFilter,
    clearAllFilters,
    saveDashboard,
    publishDashboard,
    reset,
  } = useDashboardStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit =
    session?.user.role === "admin" || session?.user.role === "alpha";

  // Load dashboard on mount
  useEffect(() => {
    setLoading(true);
    loadDashboard(id)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load dashboard"),
      )
      .finally(() => setLoading(false));

    return () => reset();
  }, [id, loadDashboard, reset]);

  // Warn on navigate away if dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Keyboard shortcut: Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && isEditMode) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveDashboard();
      toast.success("Dashboard saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [saveDashboard]);

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Publish failed");
    }
  }, [publishDashboard, dashboard?.isPublished]);

  // Cross-filter handler — sets filter in store (ChartPanel components re-fetch)
  const handleCrossFilter = useCallback(
    (column: string, value: unknown) => {
      // Toggle: clicking the same value clears the filter
      if (filters[column] === value) {
        clearFilter(column);
      } else {
        setFilter(column, value);
      }
    },
    [filters, setFilter, clearFilter],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={() => router.back()}
          className="rounded bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!dashboard) return null;

  const filterConfig = (dashboard.filterConfig as FilterConfigItem[]) ?? [];

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold text-zinc-100">
            {dashboard.name}
          </h1>
          {dashboard.description && (
            <p className="truncate text-sm text-zinc-500">
              {dashboard.description}
            </p>
          )}
        </div>

        <div className="ml-4 flex items-center gap-2">
          {/* Published badge */}
          {dashboard.isPublished && !isEditMode && (
            <a
              href={`/public/dashboard/${dashboard.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-full bg-green-900/40 px-2.5 py-1 text-xs text-green-400 hover:bg-green-900/60"
              title="View public URL"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              Published
            </a>
          )}

          {/* Edit mode controls */}
          {isEditMode ? (
            <>
              <button
                onClick={handlePublish}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  dashboard.isPublished
                    ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                    : "bg-green-700 text-white hover:bg-green-600"
                }`}
              >
                {dashboard.isPublished ? "Unpublish" : "Publish"}
              </button>
              <button
                onClick={handleDiscard}
                className="rounded px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? "Saving…" : isDirty ? "Save*" : "Save"}
              </button>
            </>
          ) : (
            canEdit && (
              <button
                onClick={() => setEditMode(true)}
                className="rounded border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
              >
                Edit
              </button>
            )
          )}
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar filterConfig={filterConfig} isEditMode={isEditMode} />

      {/* Canvas */}
      <DashboardCanvas
        isEditMode={isEditMode}
        filters={filters}
        onCrossFilter={handleCrossFilter}
      />
    </div>
  );
}
