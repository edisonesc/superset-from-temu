"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  arrayMove, rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDashboardStore, type LayoutItem } from "@/stores/dashboard-store";
import { ChartPanel } from "./ChartPanel";
import { AddChartDialog } from "./AddChartDialog";
import { MarkdownContent } from "@/components/dev-tab/markdown";
import type { FilterContext } from "@/types";

// ---------------------------------------------------------------------------
// MarkdownPanel
// ---------------------------------------------------------------------------

function MarkdownPanel({
  item,
  isEditMode,
  onRemove,
  onContentChange,
}: {
  item: LayoutItem;
  isEditMode: boolean;
  onRemove?: (panelId: string) => void;
  onContentChange: (panelId: string, content: string) => void;
}) {
  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--bg-border)",
        borderRadius: "2px",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5 shrink-0"
        style={{ borderBottom: "1px solid var(--bg-border)" }}
      >
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {isEditMode ? "Text Panel — edit below" : "Text Panel"}
        </span>
        {isEditMode && onRemove && (
          <button
            onClick={() => onRemove(item.id)}
            className="ml-2 rounded p-1 transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--error)";
              (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-elevated)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
              (e.currentTarget as HTMLButtonElement).style.background = "";
            }}
            title="Remove panel"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {isEditMode ? (
          <textarea
            value={item.content ?? ""}
            onChange={(e) => onContentChange(item.id, e.target.value)}
            className="w-full h-full resize-none outline-none text-xs font-mono"
            style={{
              background: "transparent",
              color: "var(--text-primary)",
              minHeight: "80px",
            }}
            placeholder="Enter markdown text…"
          />
        ) : (
          <MarkdownContent content={item.content ?? ""} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SortablePanel
// ---------------------------------------------------------------------------

type SortablePanelProps = {
  item: LayoutItem;
  isEditMode: boolean;
  filters: FilterContext;
  dashboardId: string;
  gridRef: React.RefObject<HTMLDivElement | null>;
  onCrossFilter: (column: string, value: unknown) => void;
  onRemove: (panelId: string) => void;
  onContentChange: (panelId: string, content: string) => void;
  onResize: (panelId: string, colSpan: number, rowSpan: number) => void;
};

function SortablePanel({
  item, isEditMode, filters, dashboardId, gridRef,
  onCrossFilter, onRemove, onContentChange, onResize,
}: SortablePanelProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    gridColumn: `span ${item.colSpan}`,
    minHeight: `${item.rowSpan * 80}px`,
  };

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const startColSpan = item.colSpan;
      const startRowSpan = item.rowSpan;

      const colWidth = gridRef.current ? gridRef.current.clientWidth / 12 : 100;
      const rowHeight = 80;

      const onMouseMove = (me: MouseEvent) => {
        const deltaX = me.clientX - startX;
        const deltaY = me.clientY - startY;
        const newColSpan = Math.max(1, Math.min(12, Math.round(startColSpan + deltaX / colWidth)));
        const newRowSpan = Math.max(1, Math.round(startRowSpan + deltaY / rowHeight));
        onResize(item.id, newColSpan, newRowSpan);
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [item.id, item.colSpan, item.rowSpan, gridRef, onResize],
  );

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 right-0 top-0 z-10 flex cursor-grab items-center justify-center py-1 active:cursor-grabbing"
          title="Drag to reorder"
        >
          <svg className="h-4 w-4" style={{ color: "var(--text-muted)" }} fill="currentColor" viewBox="0 0 24 24">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </div>
      )}

      <div className="h-full" style={{ paddingTop: isEditMode ? "24px" : 0 }}>
        {item.type === "markdown" ? (
          <MarkdownPanel
            item={item}
            isEditMode={isEditMode}
            onRemove={isEditMode ? onRemove : undefined}
            onContentChange={onContentChange}
          />
        ) : (
          <ChartPanel
            chartId={item.chartId}
            panelId={item.id}
            isEditMode={isEditMode}
            filters={filters}
            dashboardId={dashboardId}
            onCrossFilter={onCrossFilter}
            onRemove={isEditMode ? onRemove : undefined}
          />
        )}
      </div>

      {/* Resize handle — bottom-right corner, edit mode only */}
      {isEditMode && (
        <div
          onMouseDown={handleResizeMouseDown}
          className="absolute bottom-0 right-0 z-20 flex cursor-se-resize items-center justify-center"
          style={{ width: 20, height: 20 }}
          title="Drag to resize"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ color: "var(--text-muted)" }}>
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="8" cy="5" r="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardCanvas
// ---------------------------------------------------------------------------

type DashboardCanvasProps = {
  isEditMode: boolean;
  filters: FilterContext;
  dashboardId: string;
  onCrossFilter: (column: string, value: unknown) => void;
};

/**
 * Drag-and-drop grid canvas for arranging chart panels.
 * Supports multiple tabs, panel resizing, and markdown text panels.
 */
export function DashboardCanvas({ isEditMode, filters, dashboardId, onCrossFilter }: DashboardCanvasProps) {
  const {
    tabs, activeTabId,
    updateLayout, addChart, removePanel,
    updatePanelSize, addMarkdownPanel, updatePanelContent,
    addTab, removeTab, renameTab, setActiveTab,
  } = useDashboardStore();

  const activeLayout = useMemo(
    () => tabs.find((t) => t.id === activeTabId)?.layout ?? [],
    [tabs, activeTabId],
  );
  const [showAddChart, setShowAddChart] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = activeLayout.findIndex((item) => item.id === active.id);
      const newIndex = activeLayout.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      updateLayout(arrayMove(activeLayout, oldIndex, newIndex));
    },
    [activeLayout, updateLayout],
  );

  const handleAddChart = useCallback((chartId: string) => { addChart(chartId); }, [addChart]);

  const handleResize = useCallback(
    (panelId: string, colSpan: number, rowSpan: number) => {
      updatePanelSize(panelId, { colSpan, rowSpan });
    },
    [updatePanelSize],
  );

  const addChartButton = (
    <button
      onClick={() => setShowAddChart(true)}
      className="flex items-center gap-2 px-3 py-1.5 text-xs transition-colors"
      style={{
        border: "1px dashed var(--bg-border)",
        color: "var(--text-muted)",
        borderRadius: "2px",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--bg-border)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
      }}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      Add Chart
    </button>
  );

  const addTextButton = (
    <button
      onClick={() => addMarkdownPanel()}
      className="flex items-center gap-2 px-3 py-1.5 text-xs transition-colors"
      style={{
        border: "1px dashed var(--bg-border)",
        color: "var(--text-muted)",
        borderRadius: "2px",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--bg-border)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
      }}
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 6h16M4 10h16M4 14h10" />
      </svg>
      Add Text
    </button>
  );

  const isEmpty = activeLayout.length === 0;

  return (
    <>
      {/* Tab bar */}
      <div
        className="flex items-center gap-1 px-4 py-1 shrink-0 overflow-x-auto"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div key={tab.id} className="flex items-center shrink-0">
              {isEditMode && isActive ? (
                <input
                  value={tab.name}
                  onChange={(e) => renameTab(tab.id, e.target.value)}
                  className="text-xs px-2 py-1 outline-none"
                  style={{
                    background: "var(--bg-elevated)",
                    borderBottom: "2px solid var(--accent)",
                    color: "var(--text-primary)",
                    minWidth: 60,
                    maxWidth: 140,
                  }}
                />
              ) : (
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className="text-xs px-3 py-1.5 transition-colors"
                  style={{
                    borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                    color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {tab.name}
                </button>
              )}
              {isEditMode && tabs.length > 1 && (
                <button
                  onClick={() => removeTab(tab.id)}
                  className="ml-0.5 text-xs px-1 transition-colors"
                  style={{ color: "var(--text-muted)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--error)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
                  title="Remove tab"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        {isEditMode && (
          <button
            onClick={() => addTab()}
            className="text-xs px-2 py-1 ml-1 transition-colors shrink-0"
            style={{ color: "var(--accent)" }}
          >
            + Tab
          </button>
        )}
      </div>

      {/* Canvas area */}
      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
          <div className="p-6" style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)", borderRadius: "2px" }}>
            <svg className="h-12 w-12" style={{ color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-base font-medium" style={{ color: "var(--text-primary)" }}>No charts yet</p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              {isEditMode ? 'Click "Add Chart" or "Add Text" to get started.' : "Enter edit mode to add charts to this dashboard."}
            </p>
          </div>
          {isEditMode && (
            <div className="flex gap-2">
              {addChartButton}
              {addTextButton}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={activeLayout.map((item) => item.id)} strategy={rectSortingStrategy}>
              <div
                ref={gridRef}
                className="grid gap-4"
                style={{ gridTemplateColumns: "repeat(12, 1fr)" }}
              >
                {activeLayout.map((item) => (
                  <SortablePanel
                    key={item.id}
                    item={item}
                    isEditMode={isEditMode}
                    filters={filters}
                    dashboardId={dashboardId}
                    gridRef={gridRef}
                    onCrossFilter={onCrossFilter}
                    onRemove={removePanel}
                    onContentChange={updatePanelContent}
                    onResize={handleResize}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {isEditMode && (
            <div className="mt-4 flex justify-center gap-2">
              {addChartButton}
              {addTextButton}
            </div>
          )}
        </div>
      )}

      {showAddChart && <AddChartDialog onSelect={handleAddChart} onClose={() => setShowAddChart(false)} />}
    </>
  );
}
