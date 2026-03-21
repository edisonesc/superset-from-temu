"use client";

import { useState, useEffect, useRef } from "react";
import type { FilterConfig } from "@/stores/filterStore";
import { useFilterStore } from "@/stores/filterStore";

type Props = {
  config: FilterConfig;
};

/**
 * Select filter widget — fetches distinct column values from the dataset API
 * and renders a searchable multi-select dropdown.
 */
export function SelectWidget({ config }: Props) {
  const rawValue = useFilterStore((s) => s.values[config.id]);
  const setFilter = useFilterStore((s) => s.setFilter);

  const selected: string[] =
    rawValue?.type === "select" ? rawValue.values : [];

  const [options, setOptions] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load distinct values on mount if we have a datasetId and column
  useEffect(() => {
    if (!config.datasetId || !config.column) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingOptions(true);
    fetch(`/api/datasets/${config.datasetId}/values?column=${encodeURIComponent(config.column)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.error) setOptions(json.data?.values ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingOptions(false));
  }, [config.datasetId, config.column]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggleValue(val: string) {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    setFilter(config.id, { type: "select", values: next });
  }

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase()),
  );

  const displayLabel =
    selected.length === 0
      ? "Select values…"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between truncate px-2 py-1.5 text-xs transition-colors"
        style={{
          background: "var(--bg-base)",
          border: `1px solid ${open ? "var(--accent)" : "var(--bg-border)"}`,
          borderRadius: open ? "8px 8px 0 0" : "8px",
          color: selected.length ? "var(--text-primary)" : "var(--text-muted)",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
        onFocus={(e) => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 2px rgba(32,167,201,0.2)";
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
        }}
      >
        <span className="truncate">{displayLabel}</span>
        <svg
          className="ml-1 h-3 w-3 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ display: "block", transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 right-0 z-50 flex flex-col overflow-hidden"
          style={{
            top: "100%",
            marginTop: "-1px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--accent)",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px var(--bg-border)",
            maxHeight: "240px",
          }}
        >
          {/* Search */}
          <div className="p-1.5" style={{ borderBottom: "1px solid var(--bg-border)" }}>
            <input
              autoFocus
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1 text-xs outline-none"
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--bg-border)",
                borderRadius: "6px",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Options */}
          <div className="overflow-y-auto">
            {loadingOptions && (
              <p className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
                Loading…
              </p>
            )}
            {!loadingOptions && filtered.length === 0 && (
              <p className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
                No options
              </p>
            )}
            {!loadingOptions &&
              filtered.map((opt) => {
                const isSelected = selected.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleValue(opt)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors"
                    style={{
                      background: isSelected ? "var(--accent-10)" : undefined,
                      color: "var(--text-primary)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected)
                        (e.currentTarget as HTMLButtonElement).style.background = "";
                    }}
                  >
                    <span
                      className="flex h-3.5 w-3.5 shrink-0 items-center justify-center"
                      style={{
                        border: `1px solid ${isSelected ? "var(--accent)" : "var(--bg-border)"}`,
                        borderRadius: "3px",
                        background: isSelected ? "var(--accent)" : undefined,
                      }}
                    >
                      {isSelected && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="truncate">{opt}</span>
                  </button>
                );
              })}
          </div>

          {/* Clear selection */}
          {selected.length > 0 && (
            <div style={{ borderTop: "1px solid var(--bg-border)" }}>
              <button
                type="button"
                onClick={() => setFilter(config.id, { type: "select", values: [] })}
                className="w-full px-3 py-2 text-left text-xs font-medium transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--error)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
