"use client";

import { useState, useCallback } from "react";
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
import type { FilterContext } from "@/types";

type SortablePanelProps = {
  item: LayoutItem;
  isEditMode: boolean;
  filters: FilterContext;
  dashboardId: string;
  onCrossFilter: (column: string, value: unknown) => void;
  onRemove: (panelId: string) => void;
};

function SortablePanel({ item, isEditMode, filters, dashboardId, onCrossFilter, onRemove }: SortablePanelProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    gridColumn: `span ${item.colSpan}`,
    minHeight: `${item.rowSpan * 80}px`,
  };

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
        <ChartPanel
          chartId={item.chartId}
          panelId={item.id}
          isEditMode={isEditMode}
          filters={filters}
          dashboardId={dashboardId}
          onCrossFilter={onCrossFilter}
          onRemove={isEditMode ? onRemove : undefined}
        />
      </div>
    </div>
  );
}

type DashboardCanvasProps = {
  isEditMode: boolean;
  filters: FilterContext;
  dashboardId: string;
  onCrossFilter: (column: string, value: unknown) => void;
};

/**
 * Drag-and-drop grid canvas for arranging chart panels.
 */
export function DashboardCanvas({ isEditMode, filters, dashboardId, onCrossFilter }: DashboardCanvasProps) {
  const { layout, updateLayout, addChart, removePanel } = useDashboardStore();
  const [showAddChart, setShowAddChart] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = layout.findIndex((item) => item.id === active.id);
      const newIndex = layout.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      updateLayout(arrayMove(layout, oldIndex, newIndex));
    },
    [layout, updateLayout],
  );

  const handleAddChart = useCallback((chartId: string) => { addChart(chartId); }, [addChart]);

  if (layout.length === 0) {
    return (
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
            {isEditMode ? 'Click "Add Chart" to add your first chart.' : "Enter edit mode to add charts to this dashboard."}
          </p>
        </div>
        {isEditMode && (
          <button
            onClick={() => setShowAddChart(true)}
            className="px-4 py-2 text-sm font-medium text-white transition-colors"
            style={{ background: "var(--accent)", borderRadius: "2px" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent-deep)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--accent)")}
          >
            Add Chart
          </button>
        )}
        {showAddChart && <AddChartDialog onSelect={handleAddChart} onClose={() => setShowAddChart(false)} />}
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-auto p-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={layout.map((item) => item.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(12, 1fr)" }}>
              {layout.map((item) => (
                <SortablePanel
                  key={item.id}
                  item={item}
                  isEditMode={isEditMode}
                  filters={filters}
                  dashboardId={dashboardId}
                  onCrossFilter={onCrossFilter}
                  onRemove={removePanel}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {isEditMode && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setShowAddChart(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm transition-colors"
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
          </div>
        )}
      </div>

      {showAddChart && <AddChartDialog onSelect={handleAddChart} onClose={() => setShowAddChart(false)} />}
    </>
  );
}
