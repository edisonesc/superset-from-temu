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
    borderRadius: "6px",
    color: "var(--text-primary)",
    fontSize: "0.75rem",
    padding: "5px 8px",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box" as const,
    colorScheme: "dark" as const,
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  const selectStyle = {
    ...inputStyle,
    cursor: "pointer",
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
    paddingRight: "28px",
  };

  function onFocusInput(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "var(--accent)";
    e.currentTarget.style.boxShadow = "0 0 0 2px rgba(32,167,201,0.2)";
  }

  function onBlurInput(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = "var(--bg-border)";
    e.currentTarget.style.boxShadow = "none";
  }

  return (
    <div className="flex min-w-0 items-center gap-1 overflow-hidden">
      <input
        type="date"
        value={value.from ?? ""}
        onChange={(e) => update({ from: e.target.value || null })}
        style={{ ...inputStyle, flex: "1 1 0", minWidth: 0 }}
        title="From"
        onFocus={onFocusInput}
        onBlur={onBlurInput}
      />
      <span className="shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>–</span>
      <input
        type="date"
        value={value.to ?? ""}
        onChange={(e) => update({ to: e.target.value || null })}
        style={{ ...inputStyle, flex: "1 1 0", minWidth: 0 }}
        title="To"
        onFocus={onFocusInput}
        onBlur={onBlurInput}
      />
      <div className="relative shrink-0" style={{ width: "80px" }}>
        <select
          value={value.grain ?? "P1D"}
          onChange={(e) => update({ grain: e.target.value as TimeGrain })}
          style={{ ...selectStyle, width: "100%" }}
          title="Time grain"
          onFocus={onFocusInput}
          onBlur={onBlurInput}
        >
          {GRAIN_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2"
          style={{ display: "block", color: "var(--text-muted)" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
