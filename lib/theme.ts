/**
 * Design system tokens for JavaScript/ECharts contexts.
 *
 * CSS custom properties (defined in app/globals.css) cannot be used directly
 * inside ECharts option objects or CodeMirror theme strings because those APIs
 * require resolved hex/rgba values at construction time.
 *
 * This file is the single source of truth for those resolved values.
 * Every constant here maps 1-to-1 with a CSS variable in globals.css.
 * When you change a colour, update BOTH files.
 *
 * CSS var → JS constant mapping
 * ─────────────────────────────
 * --chart-1          → CHART_COLORS[0]
 * --chart-2          → CHART_COLORS[1]
 * --chart-3          → CHART_COLORS[2]
 * --chart-4          → CHART_COLORS[3]
 * --chart-5          → CHART_COLORS[4]
 * --chart-6          → CHART_COLORS[5]
 * --chart-7          → CHART_COLORS[6]
 * --heatmap-0..4     → HEATMAP_GRADIENT
 * --bg-surface       → TOOLTIP_BG
 * --bg-border        → TOOLTIP_BORDER / AXIS_LINE_COLOR
 * --bg-hover         → SPLIT_LINE_COLOR
 * --bg-elevated      → EDITOR_GUTTER_BG / EDITOR_ACTIVE_LINE
 * --text-primary     → TOOLTIP_TEXT / EDITOR_TEXT
 * --text-secondary   → PIE_LABEL_COLOR
 * --text-muted       → TEXT_COLOR
 * --accent           → EDITOR_CARET / EDITOR_CURSOR
 * --accent-10        → EDITOR_AUTOCOMPLETE_HOVER
 * --accent-15        → EDITOR_SELECTION
 * --slate-400        → HEATMAP_TOOLTIP_DIM
 * --slate-900        → AXIS_POINTER_COLOR
 * --gray-300         → PIE_LABEL_LINE_COLOR
 */

// ---------------------------------------------------------------------------
// Chart categorical palette
// ---------------------------------------------------------------------------

/** 7-colour categorical palette for all series-based charts. */
export const CHART_COLORS = [
  "#5B8AF5", // --chart-1  cornflower blue
  "#EE6B82", // --chart-2  salmon rose
  "#2CC8A4", // --chart-3  seafoam
  "#F5B731", // --chart-4  golden
  "#9F6CF7", // --chart-5  soft violet
  "#3DBDE8", // --chart-6  azure
  "#F47A4A", // --chart-7  terracotta
] as const;

/** Scatter chart uses a tighter, blue-anchored palette. */
export const SCATTER_COLORS = [
  "#5B8AF5", // cornflower blue
  "#9F6CF7", // soft violet
  "#2CC8A4", // seafoam
  "#F5B731", // golden
  "#EE6B82", // salmon rose
] as const;

/** Sequential palette for heatmap (light → dark cyan). */
export const HEATMAP_GRADIENT = [
  "#ECFEFF", // --heatmap-0
  "#A5F3FC", // --heatmap-1
  "#67E8F9", // --heatmap-2
  "#22D3EE", // --heatmap-3
  "#0E7490", // --heatmap-4 / --accent-deep
] as const;

// ---------------------------------------------------------------------------
// Axis / grid
// ---------------------------------------------------------------------------

/** Axis label and legend text colour. → --text-muted */
export const TEXT_COLOR = "#9CA3AF";

/** Horizontal grid line colour. → --bg-hover */
export const SPLIT_LINE_COLOR = "#F1F5F9";

/** Axis border line colour. → --bg-border */
export const AXIS_LINE_COLOR = "#E2E8F0";

/** Crosshair / axis-pointer line colour. → --slate-900 */
export const AXIS_POINTER_COLOR = "#1E293B";

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

/** Shared ECharts tooltip style object — drop this into any chart option. */
export const TOOLTIP_STYLE = {
  backgroundColor: "#FFFFFF",  // --bg-surface
  borderColor:     "#E2E8F0",  // --bg-border
  borderWidth: 1,
  textStyle: { color: "#111827", fontSize: 12 }, // --text-primary
  extraCssText:
    "border-radius:2px;box-shadow:0 4px 16px rgba(0,0,0,0.10);padding:10px 14px;",
} as const;

// ---------------------------------------------------------------------------
// Pie chart specifics
// ---------------------------------------------------------------------------

/** Pie slice label colour. → --text-secondary */
export const PIE_LABEL_COLOR = "#6B7280";

/** Pie label-line colour. → --gray-300 */
export const PIE_LABEL_LINE_COLOR = "#D1D5DB";

// ---------------------------------------------------------------------------
// Heatmap specifics
// ---------------------------------------------------------------------------

/** Dim text used inside heatmap tooltip formatter. → --slate-400 */
export const HEATMAP_TOOLTIP_DIM = "#94A3B8";

// ---------------------------------------------------------------------------
// Scatter specifics
// ---------------------------------------------------------------------------

/** Shadow colour on scatter point emphasis hover. */
export const SCATTER_EMPHASIS_SHADOW = "rgba(99,102,241,0.4)";

// ---------------------------------------------------------------------------
// CodeMirror / SqlEditor
// ---------------------------------------------------------------------------

export const EDITOR_BG             = "#FFFFFF";  // --bg-surface
export const EDITOR_TEXT           = "#111827";  // --text-primary
export const EDITOR_CARET          = "#20A7C9";  // --accent
export const EDITOR_ACTIVE_LINE    = "#F8FAFC";  // --bg-elevated
export const EDITOR_SELECTION      = "rgba(32,167,201,0.15)"; // --accent-15
export const EDITOR_GUTTER_BG     = "#F8FAFC";  // --bg-elevated
export const EDITOR_GUTTER_BORDER = "#E2E8F0";  // --bg-border
export const EDITOR_GUTTER_TEXT   = "#9CA3AF";  // --text-muted
export const EDITOR_TOOLTIP_BG    = "#FFFFFF";  // --bg-surface
export const EDITOR_TOOLTIP_BORDER = "#E2E8F0"; // --bg-border
export const EDITOR_AUTOCOMPLETE_HOVER = "rgba(32,167,201,0.10)"; // --accent-10
export const EDITOR_PLACEHOLDER   = "#9CA3AF";  // --text-muted
