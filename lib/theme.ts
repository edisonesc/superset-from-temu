/**
 * Design system tokens for JavaScript/ECharts/CodeMirror contexts.
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

"use client";

import { useTheme } from "@/components/theme-provider";

// ---------------------------------------------------------------------------
// Chart categorical palette — same for both themes (vivid colours work on both)
// ---------------------------------------------------------------------------

/** 7-colour cyan gradient palette — light to deep, mirrors heatmap scale. */
export const CHART_COLORS = [
  "#CFFAFE", // --chart-1  cyan-100
  "#A5F3FC", // --chart-2  cyan-200
  "#67E8F9", // --chart-3  cyan-300
  "#22D3EE", // --chart-4  cyan-400
  "#06B6D4", // --chart-5  cyan-500
  "#0891B2", // --chart-6  cyan-600
  "#0E7490", // --chart-7  cyan-700
] as const;

/** Scatter chart uses a tighter, blue-anchored palette. */
export const SCATTER_COLORS = [
  "#5B8AF5", // cornflower blue
  "#9F6CF7", // soft violet
  "#2CC8A4", // seafoam
  "#F5B731", // golden
  "#EE6B82", // salmon rose
] as const;

// ---------------------------------------------------------------------------
// Typed token bags — one per theme
// ---------------------------------------------------------------------------

export interface ThemeTokens {
  // Axis / grid
  TEXT_COLOR: string;
  SPLIT_LINE_COLOR: string;
  AXIS_LINE_COLOR: string;
  AXIS_POINTER_COLOR: string;

  // Tooltip
  TOOLTIP_STYLE: {
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    textStyle: { color: string; fontSize: number };
    extraCssText: string;
  };

  // Pie
  PIE_LABEL_COLOR: string;
  PIE_LABEL_LINE_COLOR: string;

  // Heatmap
  HEATMAP_GRADIENT: readonly [string, string, string, string, string];
  HEATMAP_TOOLTIP_DIM: string;

  // Geo map gradient — cream → rose → hot-pink → purple → near-black
  MAP_GRADIENT: readonly [string, string, string, string, string];

  // Geo map colours (theme-aware)
  GEO_SEA_COLOR: string; // ocean / canvas background
  GEO_AREA_COLOR: string; // default land fill
  GEO_AREA_HOVER_COLOR: string; // emphasis/hover land fill
  GEO_BORDER_COLOR: string; // country border stroke
  GEO_LABEL_COLOR: string; // continent / region label text

  // Chart palettes (theme-specific)
  chartColors: readonly string[];
  scatterColors: readonly string[];

  // Scatter
  SCATTER_EMPHASIS_SHADOW: string;

  // CodeMirror / SqlEditor
  EDITOR_BG: string;
  EDITOR_TEXT: string;
  EDITOR_CARET: string;
  EDITOR_ACTIVE_LINE: string;
  EDITOR_SELECTION: string;
  EDITOR_GUTTER_BG: string;
  EDITOR_GUTTER_BORDER: string;
  EDITOR_GUTTER_TEXT: string;
  EDITOR_TOOLTIP_BG: string;
  EDITOR_TOOLTIP_BORDER: string;
  EDITOR_AUTOCOMPLETE_HOVER: string;
  EDITOR_PLACEHOLDER: string;
}

// ---------------------------------------------------------------------------
// Light tokens
// ---------------------------------------------------------------------------

export const LIGHT_TOKENS: ThemeTokens = {
  TEXT_COLOR: "#9CA3AF", // --text-muted
  SPLIT_LINE_COLOR: "#F1F5F9", // --bg-hover
  AXIS_LINE_COLOR: "#E2E8F0", // --bg-border
  AXIS_POINTER_COLOR: "#1E293B", // --slate-900

  TOOLTIP_STYLE: {
    backgroundColor: "#FFFFFF", // --bg-surface
    borderColor: "#E2E8F0", // --bg-border
    borderWidth: 1,
    textStyle: { color: "#111827", fontSize: 12 }, // --text-primary
    extraCssText:
      "border-radius:2px;box-shadow:0 4px 16px rgba(0,0,0,0.10);padding:10px 14px;",
  },

  PIE_LABEL_COLOR: "#6B7280", // --text-secondary
  PIE_LABEL_LINE_COLOR: "#D1D5DB", // --gray-300

  // Aurora Borealis: ice-white → arctic blue → polar cyan → aurora indigo → deep space
  HEATMAP_GRADIENT: [
    "#EEF9FF", // --heatmap-0  ice white
    "#7ADCF5", // --heatmap-1  arctic blue
    "#0AB5D4", // --heatmap-2  polar cyan
    "#4428E0", // --heatmap-3  aurora indigo
    "#1A0858", // --heatmap-4  deep space (highest value)
  ],

  HEATMAP_TOOLTIP_DIM: "#94A3B8", // --slate-400
  SCATTER_EMPHASIS_SHADOW: "rgba(98,72,236,0.35)",

  // Oceanic: pale sky → sky blue → deep ocean → midnight → void
  MAP_GRADIENT: [
    "#EDF5FF", // --map-gradient-0  pale sky
    "#78C0F0", // --map-gradient-1  sky blue
    "#1870D0", // --map-gradient-2  deep ocean
    "#2818A8", // --map-gradient-3  midnight blue
    "#080418", // --map-gradient-4  near-black void
  ] as const,

  // Geo map — light mode: clean polar cartography
  GEO_SEA_COLOR: "#DBF0F8", // polar blue ocean
  GEO_AREA_COLOR: "#E8F4EC", // pale sage land
  GEO_AREA_HOVER_COLOR: "#B8E2D0", // mint highlight
  GEO_BORDER_COLOR: "#58A8C8", // steel teal borders
  GEO_LABEL_COLOR: "#2870A8", // ocean blue labels

  chartColors: [
    "#0E7490", // cyan-700  (deepest)
    "#0891B2", // cyan-600
    "#06B6D4", // cyan-500
    "#20A7C9", // --accent
    "#22D3EE", // cyan-400
    "#67E8F9", // cyan-300
    "#A5F3FC", // cyan-200
  ] as const,
  scatterColors: SCATTER_COLORS,

  EDITOR_BG: "#FFFFFF", // --bg-surface
  EDITOR_TEXT: "#111827", // --text-primary
  EDITOR_CARET: "#20A7C9", // --accent
  EDITOR_ACTIVE_LINE: "#F8FAFC", // --bg-elevated
  EDITOR_SELECTION: "rgba(32,167,201,0.15)", // --accent-15
  EDITOR_GUTTER_BG: "#F8FAFC", // --bg-elevated
  EDITOR_GUTTER_BORDER: "#E2E8F0", // --bg-border
  EDITOR_GUTTER_TEXT: "#9CA3AF", // --text-muted
  EDITOR_TOOLTIP_BG: "#FFFFFF", // --bg-surface
  EDITOR_TOOLTIP_BORDER: "#E2E8F0", // --bg-border
  EDITOR_AUTOCOMPLETE_HOVER: "rgba(32,167,201,0.10)", // --accent-10
  EDITOR_PLACEHOLDER: "#9CA3AF", // --text-muted
};

// ---------------------------------------------------------------------------
// Dark tokens
// ---------------------------------------------------------------------------

export const DARK_TOKENS: ThemeTokens = {
  TEXT_COLOR: "#4A5568", // --text-muted dark
  SPLIT_LINE_COLOR: "#161B28", // --bg-hover dark
  AXIS_LINE_COLOR: "#1C2130", // --bg-border dark
  AXIS_POINTER_COLOR: "#E2EAF8", // --slate-900 dark (inverted)

  TOOLTIP_STYLE: {
    backgroundColor: "#0C1018", // --bg-surface dark
    borderColor: "#1C2130", // --bg-border dark
    borderWidth: 1,
    textStyle: { color: "#E8EEF8", fontSize: 12 }, // --text-primary dark
    extraCssText:
      "border-radius:2px;box-shadow:0 4px 24px rgba(0,0,0,0.60);padding:10px 14px;",
  },

  PIE_LABEL_COLOR: "#8FA4C0", // slightly brighter for dark neon context
  PIE_LABEL_LINE_COLOR: "#2A3450", // subtle connector lines

  // Solar Plasma: void → deep violet → plasma magenta → orange → solar gold
  HEATMAP_GRADIENT: [
    "#060410", // --heatmap-0  void black
    "#480880", // --heatmap-1  plasma violet
    "#C010A8", // --heatmap-2  plasma magenta
    "#FF4820", // --heatmap-3  plasma orange
    "#FFD840", // --heatmap-4  solar gold (highest value)
  ],

  HEATMAP_TOOLTIP_DIM: "#4A5568", // --slate-400 dark
  SCATTER_EMPHASIS_SHADOW: "rgba(8,216,240,0.35)",

  // Thermal Vision: cold void → violet → magenta → hot → peak gold
  MAP_GRADIENT: [
    "#040818", // --map-gradient-0  cold void
    "#3808A0", // --map-gradient-1  cold signal
    "#C800C8", // --map-gradient-2  warm signal
    "#FF3808", // --map-gradient-3  hot signal
    "#FFE030", // --map-gradient-4  peak signal
  ] as const,

  // Geo map — dark mode: cyberpunk night earth
  GEO_SEA_COLOR: "#040B14", // deep space navy
  GEO_AREA_COLOR: "#0C1828", // dark slate
  GEO_AREA_HOVER_COLOR: "#142238", // lit slate
  GEO_BORDER_COLOR: "rgba(8,216,240,0.55)", // cyan glow borders
  GEO_LABEL_COLOR: "#28C8E8", // electric cyan labels

  chartColors: [
    "#5EECFA", // --accent-bright dark (brightest)
    "#00D4E8", // --accent dark (electric cyan)
    "#00C8D8", // --accent-cyan dark
    "#22D3EE", // cyan-400
    "#06B6D4", // cyan-500
    "#0891B2", // cyan-600
    "#0097B2", // --accent-deep dark
  ],
  scatterColors: [
    "#00D4E8", // electric cyan
    "#A855F7", // bright violet
    "#00E5A0", // neon emerald
    "#FFB800", // vivid amber
    "#FF4F8B", // hot pink
  ],

  EDITOR_BG: "#0C1018", // --bg-surface dark
  EDITOR_TEXT: "#E8EEF8", // --text-primary dark
  EDITOR_CARET: "#00D4E8", // --accent dark
  EDITOR_ACTIVE_LINE: "#111620", // --bg-elevated dark
  EDITOR_SELECTION: "rgba(0,212,232,0.15)", // --accent-15 dark
  EDITOR_GUTTER_BG: "#111620", // --bg-elevated dark
  EDITOR_GUTTER_BORDER: "#1C2130", // --bg-border dark
  EDITOR_GUTTER_TEXT: "#4A5568", // --text-muted dark
  EDITOR_TOOLTIP_BG: "#0C1018", // --bg-surface dark
  EDITOR_TOOLTIP_BORDER: "#1C2130", // --bg-border dark
  EDITOR_AUTOCOMPLETE_HOVER: "rgba(0,212,232,0.10)", // --accent-10 dark
  EDITOR_PLACEHOLDER: "#4A5568", // --text-muted dark
};

// ---------------------------------------------------------------------------
// Hook — returns the correct token bag for the active theme
// ---------------------------------------------------------------------------

export function useEchartsTheme(): ThemeTokens {
  const { theme } = useTheme();
  return theme === "dark" ? DARK_TOKENS : LIGHT_TOKENS;
}

// ---------------------------------------------------------------------------
// Legacy flat exports — kept for any remaining direct imports
// Prefer useEchartsTheme() in components going forward.
// ---------------------------------------------------------------------------

/** @deprecated Use useEchartsTheme().TEXT_COLOR */
export const TEXT_COLOR = LIGHT_TOKENS.TEXT_COLOR;
/** @deprecated Use useEchartsTheme().SPLIT_LINE_COLOR */
export const SPLIT_LINE_COLOR = LIGHT_TOKENS.SPLIT_LINE_COLOR;
/** @deprecated Use useEchartsTheme().AXIS_LINE_COLOR */
export const AXIS_LINE_COLOR = LIGHT_TOKENS.AXIS_LINE_COLOR;
/** @deprecated Use useEchartsTheme().AXIS_POINTER_COLOR */
export const AXIS_POINTER_COLOR = LIGHT_TOKENS.AXIS_POINTER_COLOR;
/** @deprecated Use useEchartsTheme().TOOLTIP_STYLE */
export const TOOLTIP_STYLE = LIGHT_TOKENS.TOOLTIP_STYLE;
/** @deprecated Use useEchartsTheme().PIE_LABEL_COLOR */
export const PIE_LABEL_COLOR = LIGHT_TOKENS.PIE_LABEL_COLOR;
/** @deprecated Use useEchartsTheme().PIE_LABEL_LINE_COLOR */
export const PIE_LABEL_LINE_COLOR = LIGHT_TOKENS.PIE_LABEL_LINE_COLOR;
/** @deprecated Use useEchartsTheme().HEATMAP_GRADIENT */
export const HEATMAP_GRADIENT = LIGHT_TOKENS.HEATMAP_GRADIENT;
/** @deprecated Use useEchartsTheme().HEATMAP_TOOLTIP_DIM */
export const HEATMAP_TOOLTIP_DIM = LIGHT_TOKENS.HEATMAP_TOOLTIP_DIM;
/** @deprecated Use useEchartsTheme().SCATTER_EMPHASIS_SHADOW */
export const SCATTER_EMPHASIS_SHADOW = LIGHT_TOKENS.SCATTER_EMPHASIS_SHADOW;
/** @deprecated Use useEchartsTheme().EDITOR_BG */
export const EDITOR_BG = LIGHT_TOKENS.EDITOR_BG;
/** @deprecated Use useEchartsTheme().EDITOR_TEXT */
export const EDITOR_TEXT = LIGHT_TOKENS.EDITOR_TEXT;
/** @deprecated Use useEchartsTheme().EDITOR_CARET */
export const EDITOR_CARET = LIGHT_TOKENS.EDITOR_CARET;
/** @deprecated Use useEchartsTheme().EDITOR_ACTIVE_LINE */
export const EDITOR_ACTIVE_LINE = LIGHT_TOKENS.EDITOR_ACTIVE_LINE;
/** @deprecated Use useEchartsTheme().EDITOR_SELECTION */
export const EDITOR_SELECTION = LIGHT_TOKENS.EDITOR_SELECTION;
/** @deprecated Use useEchartsTheme().EDITOR_GUTTER_BG */
export const EDITOR_GUTTER_BG = LIGHT_TOKENS.EDITOR_GUTTER_BG;
/** @deprecated Use useEchartsTheme().EDITOR_GUTTER_BORDER */
export const EDITOR_GUTTER_BORDER = LIGHT_TOKENS.EDITOR_GUTTER_BORDER;
/** @deprecated Use useEchartsTheme().EDITOR_GUTTER_TEXT */
export const EDITOR_GUTTER_TEXT = LIGHT_TOKENS.EDITOR_GUTTER_TEXT;
/** @deprecated Use useEchartsTheme().EDITOR_TOOLTIP_BG */
export const EDITOR_TOOLTIP_BG = LIGHT_TOKENS.EDITOR_TOOLTIP_BG;
/** @deprecated Use useEchartsTheme().EDITOR_TOOLTIP_BORDER */
export const EDITOR_TOOLTIP_BORDER = LIGHT_TOKENS.EDITOR_TOOLTIP_BORDER;
/** @deprecated Use useEchartsTheme().EDITOR_AUTOCOMPLETE_HOVER */
export const EDITOR_AUTOCOMPLETE_HOVER = LIGHT_TOKENS.EDITOR_AUTOCOMPLETE_HOVER;
/** @deprecated Use useEchartsTheme().EDITOR_PLACEHOLDER */
export const EDITOR_PLACEHOLDER = LIGHT_TOKENS.EDITOR_PLACEHOLDER;
