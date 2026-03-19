"use client";

import { useState, useEffect, useRef } from "react";
import type { FilterConfig } from "@/stores/filterStore";
import { useFilterStore } from "@/stores/filterStore";

const DEBOUNCE_MS = 300;

type Props = {
  config: FilterConfig;
};

/**
 * Search filter widget — a debounced text input that applies a LIKE filter
 * on the target column. Calls setFilter after 300ms of inactivity.
 */
export function SearchWidget({ config }: Props) {
  const rawValue = useFilterStore((s) => s.values[config.id]);
  const setFilter = useFilterStore((s) => s.setFilter);

  const storeQuery = rawValue?.type === "search" ? rawValue.query : "";
  const [localQuery, setLocalQuery] = useState(storeQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from store when reset externally (e.g. clear all)
  useEffect(() => {
    setLocalQuery(storeQuery);
  }, [storeQuery]);

  function handleChange(val: string) {
    setLocalQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilter(config.id, { type: "search", query: val });
    }, DEBOUNCE_MS);
  }

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="relative flex items-center">
      <svg
        className="pointer-events-none absolute left-2 h-3 w-3"
        style={{ color: "var(--text-muted)" }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
        />
      </svg>
      <input
        type="text"
        value={localQuery}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={`Search ${config.column}…`}
        className="w-full py-1.5 pl-7 pr-2 text-xs outline-none"
        style={{
          background: "var(--bg-base)",
          border: "1px solid var(--bg-border)",
          borderRadius: "2px",
          color: "var(--text-primary)",
        }}
        onFocus={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "var(--accent)")}
        onBlur={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = "var(--bg-border)")}
      />
      {localQuery && (
        <button
          type="button"
          onClick={() => handleChange("")}
          className="absolute right-2"
          style={{ color: "var(--text-muted)" }}
          title="Clear"
        >
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
