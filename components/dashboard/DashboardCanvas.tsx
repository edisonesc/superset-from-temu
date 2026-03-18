"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDashboardStore, type LayoutItem } from "@/stores/dashboard-store";
import { ChartPanel } from "./ChartPanel";
import { AddChartDialog } from "./AddChartDialog";
import type { FilterContext } from "@/types";

// ---------------------------------------------------------------------------
// SortablePanel
// ---------------------------------------------------------------------------

type SortablePanelProps = {
  item: LayoutItem;
  isEditMode: boolean;
  filters: FilterContext;
  onCrossFilter: (column: string, value: unknown) => void;
  onRemove: (panelId: string) => void;
};

function SortablePanel({
  item,
  isEditMode,
  filters,
  onCrossFilter,
  onRemove,
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

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Drag handle — only in edit mode */}
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 right-0 top-0 z-10 flex cursor-grab items-center justify-center py-1 active:cursor-grabbing"
          title="Drag to reorder"
        >
          <svg
            className="h-4 w-4 text-zinc-600"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
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
          onCrossFilter={onCrossFilter}
          onRemove={isEditMode ? onRemove : undefined}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardCanvas
// ---------------------------------------------------------------------------

type DashboardCanvasProps = {
  isEditMode: boolean;
  filters: FilterContext;
  onCrossFilter: (column: string, value: unknown) => void;
};

/**
 * Drag-and-drop grid canvas for arranging chart panels.
 * 12-column CSS grid. In edit mode panels are draggable via dnd-kit.
 * Chart element clicks bubble up cross-filter events.
 */
export function DashboardCanvas({
  isEditMode,
  filters,
  onCrossFilter,
}: DashboardCanvasProps) {
  const { layout, updateLayout, addChart, removePanel } = useDashboardStore();
  const [showAddChart, setShowAddChart] = useState(false);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
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

  const handleAddChart = useCallback(
    (chartId: string) => {
      addChart(chartId);
    },
    [addChart],
  );

  // Empty state
  if (layout.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
        <div className="rounded-full bg-zinc-800/50 p-6">
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <div>
          <p className="text-base font-medium text-zinc-300">
            No charts yet
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {isEditMode
              ? 'Click "Add Chart" to add your first chart.'
              : "Enter edit mode to add charts to this dashboard."}
          </p>
        </div>
        {isEditMode && (
          <button
            onClick={() => setShowAddChart(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Add Chart
          </button>
        )}
        {showAddChart && (
          <AddChartDialog
            onSelect={handleAddChart}
            onClose={() => setShowAddChart(false)}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={layout.map((item) => item.id)}
            strategy={rectSortingStrategy}
          >
            {/* 12-column CSS grid */}
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: "repeat(12, 1fr)" }}
            >
              {layout.map((item) => (
                <SortablePanel
                  key={item.id}
                  item={item}
                  isEditMode={isEditMode}
                  filters={filters}
                  onCrossFilter={onCrossFilter}
                  onRemove={removePanel}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add Chart button (edit mode) */}
        {isEditMode && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setShowAddChart(true)}
              className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-700 px-4 py-2 text-sm text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
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
              Add Chart
            </button>
          </div>
        )}
      </div>

      {showAddChart && (
        <AddChartDialog
          onSelect={handleAddChart}
          onClose={() => setShowAddChart(false)}
        />
      )}
    </>
  );
}
