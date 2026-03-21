"use client";

import { useEffect, useRef } from "react";
import { EditorView, lineNumbers, drawSelection, highlightActiveLine, keymap, placeholder } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { sql } from "@codemirror/lang-sql";
import { useTheme } from "@/components/theme-provider";
import { LIGHT_TOKENS, DARK_TOKENS, type ThemeTokens } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Theme builder — constructs a CodeMirror theme from a token bag
// ---------------------------------------------------------------------------

function buildEditorTheme(t: ThemeTokens, dark: boolean) {
  return EditorView.theme(
    {
      "&": {
        backgroundColor: t.EDITOR_BG,
        color: t.EDITOR_TEXT,
        height: "100%",
        fontSize: "13px",
      },
      ".cm-content": {
        fontFamily: "var(--font-geist-mono), 'JetBrains Mono', monospace",
        caretColor: t.EDITOR_CARET,
        padding: "8px 0",
      },
      ".cm-cursor": { borderLeftColor: t.EDITOR_CARET },
      ".cm-activeLine": { backgroundColor: t.EDITOR_ACTIVE_LINE },
      ".cm-selectionBackground, ::selection": { backgroundColor: `${t.EDITOR_SELECTION} !important` },
      ".cm-gutters": {
        backgroundColor: t.EDITOR_GUTTER_BG,
        borderRight: `1px solid ${t.EDITOR_GUTTER_BORDER}`,
        color: t.EDITOR_GUTTER_TEXT,
      },
      ".cm-lineNumbers .cm-gutterElement": { paddingLeft: "8px", paddingRight: "12px" },
      ".cm-focused .cm-selectionBackground": { backgroundColor: t.EDITOR_SELECTION },
      ".cm-tooltip": {
        backgroundColor: t.EDITOR_TOOLTIP_BG,
        border: `1px solid ${t.EDITOR_TOOLTIP_BORDER}`,
        color: t.EDITOR_TEXT,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      },
      ".cm-tooltip-autocomplete ul li[aria-selected]": {
        backgroundColor: t.EDITOR_AUTOCOMPLETE_HOVER,
        color: t.EDITOR_TEXT,
      },
      ".cm-placeholder": { color: t.EDITOR_PLACEHOLDER },
      "&.cm-all-selected .cm-content": { background: t.EDITOR_SELECTION },
    },
    { dark },
  );
}

const lightTheme = buildEditorTheme(LIGHT_TOKENS, false);
const darkTheme  = buildEditorTheme(DARK_TOKENS, true);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type SqlEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CodeMirror 6 SQL editor with theme-aware styling, line numbers, and Ctrl/Cmd+Enter to run.
 * Manages its own EditorView instance and syncs value externally via props.
 * Theme is hot-swapped via a Compartment when the global theme changes.
 */
export default function SqlEditor({ value, onChange, onRun, className }: SqlEditorProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartment = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);

  // Keep refs in sync so closures always see latest callbacks
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onRunRef.current = onRun; }, [onRun]);

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const initialTheme = document.documentElement.classList.contains("dark")
      ? darkTheme
      : lightTheme;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          sql(),
          lineNumbers(),
          drawSelection(),
          highlightActiveLine(),
          placeholder("Write SQL here…  Ctrl+Enter to run"),
          themeCompartment.current.of(initialTheme),
          keymap.of([
            {
              key: "Ctrl-Enter",
              run: () => {
                onRunRef.current?.();
                return true;
              },
            },
            {
              key: "Mod-Enter",
              run: () => {
                onRunRef.current?.();
                return true;
              },
            },
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
            const { from, to } = update.state.selection.main;
            const allSelected = update.state.selection.ranges.length === 1
              && from === 0
              && to === update.state.doc.length
              && to > 0;
            update.view.dom.classList.toggle("cm-all-selected", allSelected);
          }),
          EditorView.lineWrapping,
        ],
      }),
      parent: containerRef.current,
    });

    viewRef.current = view;
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hot-swap the CodeMirror theme when the global theme changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartment.current.reconfigure(
        theme === "dark" ? darkTheme : lightTheme,
      ),
    });
  }, [theme]);

  // Sync external value changes into the editor (e.g. loading saved query)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ overflow: "auto" }}
    />
  );
}
