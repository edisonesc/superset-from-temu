"use client";

import { useState, useRef } from "react";
import type { ReactNode } from "react";

export type DevTabItem = {
  title: string;
  content: ReactNode;
};

export function DevTabFAB({ items }: { items: DevTabItem[] }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const tabBarRef = useRef<HTMLDivElement>(null);

  function scrollTabs(dir: "left" | "right") {
    const el = tabBarRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -160 : 160, behavior: "smooth" });
  }

  return (
    <>
      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        title="Developer Tab"
        style={{
          position: "fixed",
          bottom: "88px",
          right: "20px",
          zIndex: 9997,
          display: "flex",
          alignItems: "center",
          padding: "7px 13px",
          background: "#1e293b",
          color: "#94a3b8",
          border: "1px solid #334155",
          borderRadius: "2px",
          fontSize: "12px",
          fontFamily: "inherit",
          fontWeight: 500,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          transition: "background 0.15s, color 0.15s, border-color 0.15s",
          letterSpacing: "0.02em",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#0f172a";
          e.currentTarget.style.color = "#e2e8f0";
          e.currentTarget.style.borderColor = "#475569";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#1e293b";
          e.currentTarget.style.color = "#94a3b8";
          e.currentTarget.style.borderColor = "#334155";
        }}
      >
        Developer Tab
      </button>

      {/* ── Backdrop ────────────────────────────────────────────────────── */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(15,23,42,0.45)",
          backdropFilter: "blur(2px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.2s ease",
        }}
      />

      {/* ── Slide-in Drawer ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100dvh",
          width: "min(740px, 92vw)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-surface)",
          borderLeft: "1px solid var(--bg-border)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            height: "48px",
            flexShrink: 0,
            borderBottom: "1px solid #1e293b",
            background: "#1e293b",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#e2e8f0",
              letterSpacing: "0.03em",
            }}
          >
            Developer Tab
          </span>
          <button
            onClick={() => setOpen(false)}
            title="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#64748b",
              fontSize: "18px",
              lineHeight: 1,
              padding: "4px 6px",
              borderRadius: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
          >
            ✕
          </button>
        </div>

        {/* ── Horizontal tab bar with scroll arrows ───────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            flexShrink: 0,
            borderBottom: "1px solid var(--bg-border)",
            background: "var(--bg-elevated)",
            height: "40px",
          }}
        >
          {/* Left arrow */}
          <button
            onClick={() => scrollTabs("left")}
            aria-label="Scroll tabs left"
            style={{
              flexShrink: 0,
              width: "32px",
              border: "none",
              borderRight: "1px solid var(--bg-border)",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            ‹
          </button>

          {/* Scrollable tab list */}
          <div
            ref={tabBarRef}
            style={{
              flex: 1,
              display: "flex",
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            {items.map((item, idx) => {
              const isActive = activeIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  style={{
                    flexShrink: 0,
                    padding: "0 18px",
                    height: "40px",
                    fontSize: "12.5px",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive
                      ? "var(--accent)"
                      : "var(--text-secondary)",
                    background: isActive
                      ? "var(--bg-surface)"
                      : "transparent",
                    border: "none",
                    borderBottom: isActive
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "color 0.1s, background 0.1s, border-color 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  {item.title}
                </button>
              );
            })}
          </div>

          {/* Right arrow */}
          <button
            onClick={() => scrollTabs("right")}
            aria-label="Scroll tabs right"
            style={{
              flexShrink: 0,
              width: "32px",
              border: "none",
              borderLeft: "1px solid var(--bg-border)",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--text-primary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--text-muted)")
            }
          >
            ›
          </button>
        </div>

        {/* ── Content pane ────────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "18px 22px 40px",
          }}
        >
          {items[activeIndex]?.content ?? null}
        </div>
      </div>
    </>
  );
}
