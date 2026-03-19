"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import type { ChartComponentProps, ChartConfig, ChartConfigSchema, Row } from "@/types";

export const configSchema: ChartConfigSchema = {
  fields: [
    { name: "showLegend", label: "Show Column Headers", type: "boolean", defaultValue: true },
  ],
};

export const defaultConfig: Partial<ChartConfig> = {};

/** Transforms raw rows into TableChart props. */
export function transformer(rows: Row[], config: ChartConfig): ChartComponentProps {
  return { data: rows, config };
}

/**
 * Data table chart using @tanstack/react-table.
 * Supports column sorting, pagination, and row click cross-filtering.
 */
export default function TableChart({ data, config, onCrossFilter }: ChartComponentProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<Row>[]>(() => {
    if (!data?.length) return [];
    return Object.keys(data[0]).map((key) => ({
      accessorKey: key,
      header: key,
      cell: (info) => {
        const val = info.getValue();
        if (val === null || val === undefined) return <span style={{ color: "var(--text-muted)" }}>—</span>;
        return String(val);
      },
    }));
  }, [data]);

  const table = useReactTable({
    data: data ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  if (!data?.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
        No data available
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0" style={{ background: "var(--bg-elevated)" }}>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-2 text-left font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap"
                    style={{
                      color: "var(--text-secondary)",
                      borderBottom: "1px solid var(--bg-border)",
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc" && " ↑"}
                    {header.column.getIsSorted() === "desc" && " ↓"}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className="cursor-pointer transition-colors"
                style={{
                  background: i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)",
                  borderBottom: "1px solid var(--bg-border)",
                }}
                onClick={() => {
                  if (onCrossFilter) {
                    const keys = Object.keys(row.original);
                    if (keys[0]) onCrossFilter(keys[0], row.original[keys[0]]);
                  }
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)")}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-1.5 whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        className="flex items-center justify-between px-3 py-2 text-xs"
        style={{ borderTop: "1px solid var(--bg-border)", background: "var(--bg-surface)", color: "var(--text-muted)" }}
      >
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-2 py-1 transition-colors disabled:opacity-40"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--bg-border)",
              color: "var(--text-secondary)",
              borderRadius: "2px",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "var(--bg-border)")}
          >
            Prev
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-2 py-1 transition-colors disabled:opacity-40"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--bg-border)",
              color: "var(--text-secondary)",
              borderRadius: "2px",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.borderColor = "var(--bg-border)")}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
