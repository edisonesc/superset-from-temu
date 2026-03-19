"use client";

import type { FilterConfig, FilterValue, TimeGrain } from "@/stores/filterStore";
import { useFilterStore } from "@/stores/filterStore";

const GRAIN_OPTIONS: { value: TimeGrain; label: string }[] = [
  { value: "PT1M", label: "Minute" },
  { value: "PT1H", label: "Hour" },
  { value: "P1D", label: "Day" },
  { value: "P1W", label: "Week" },
  { value: "P1M", label: "Month" },
  { value: "P1Y", label: "Year" },
];

type Props = {
  config: FilterConfig;
};

/**
 * Date range filter widget — two date inputs (from/to) plus a time grain selector.
 * Updates the filter store on every change.
 */
export function DateRangeWidget({ config }: Props) {
  const rawValue = useFilterStore((s) => s.values[config.id]);
  const setFilter = useFilterStore((s) => s.setFilter);

  const value =
    rawValue?.type === "date_range"
      ? rawValue
      : { type: "date_range" as const, from: null, to: null };

  function update(patch: Partial<Omit<FilterValue & { type: "date_range" }, "type">>) {
    setFilter(config.id, { ...value, ...patch, type: "date_range" });
  }

  const inputStyle = {
    background: "var(--bg-base)",
    border: "1px solid var(--bg-border)",
    borderRadius: "2px",
    color: "var(--text-primary)",
    fontSize: "0.75rem",
    padding: "4px 8px",
    width: "100%",
    colorScheme: "dark" as const,
  };

  const selectStyle = {
    ...inputStyle,
    cursor: "pointer",
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <div className="flex-1">
          <label className="mb-0.5 block text-xs" style={{ color: "var(--text-muted)" }}>
            From
          </label>
          <input
            type="date"
            value={value.from ?? ""}
            onChange={(e) => update({ from: e.target.value || null })}
            style={inputStyle}
          />
        </div>
        <div className="flex-1">
          <label className="mb-0.5 block text-xs" style={{ color: "var(--text-muted)" }}>
            To
          </label>
          <input
            type="date"
            value={value.to ?? ""}
            onChange={(e) => update({ to: e.target.value || null })}
            style={inputStyle}
          />
        </div>
      </div>
      <div>
        <label className="mb-0.5 block text-xs" style={{ color: "var(--text-muted)" }}>
          Grain
        </label>
        <select
          value={value.grain ?? "P1D"}
          onChange={(e) => update({ grain: e.target.value as TimeGrain })}
          style={selectStyle}
        >
          {GRAIN_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
