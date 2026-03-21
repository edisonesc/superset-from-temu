"use client";
import type React from "react";

type ResizeHandleProps = {
  direction: "horizontal" | "vertical";
  onResizeStart: (e: React.MouseEvent) => void;
};

export default function ResizeHandle({ direction, onResizeStart }: ResizeHandleProps) {
  const isHorizontal = direction === "horizontal";
  const style: React.CSSProperties = isHorizontal
    ? {
        width: "4px",
        cursor: "col-resize",
        flexShrink: 0,
        alignSelf: "stretch",
        background: "var(--bg-border)",
        zIndex: 10,
        transition: "background 120ms",
      }
    : {
        height: "4px",
        cursor: "row-resize",
        width: "100%",
        flexShrink: 0,
        background: "var(--bg-border)",
        zIndex: 10,
        transition: "background 120ms",
      };

  return (
    <div
      style={style}
      onMouseDown={(e) => {
        e.preventDefault();
        onResizeStart(e);
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "var(--bg-border)";
      }}
      role="separator"
      aria-orientation={isHorizontal ? "vertical" : "horizontal"}
    />
  );
}
