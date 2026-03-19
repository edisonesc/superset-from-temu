"use client";

import { useEffect, useRef } from "react";
import { EditorView, lineNumbers, drawSelection, highlightActiveLine, keymap, placeholder } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { sql } from "@codemirror/lang-sql";
import {
  EDITOR_BG, EDITOR_TEXT, EDITOR_CARET, EDITOR_ACTIVE_LINE, EDITOR_SELECTION,
  EDITOR_GUTTER_BG, EDITOR_GUTTER_BORDER, EDITOR_GUTTER_TEXT,
  EDITOR_TOOLTIP_BG, EDITOR_TOOLTIP_BORDER, EDITOR_AUTOCOMPLETE_HOVER, EDITOR_PLACEHOLDER,
} from "@/lib/theme";

// ---------------------------------------------------------------------------
// Light theme matching the app's corporate palette
// ---------------------------------------------------------------------------

const lightTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: EDITOR_BG,
      color: EDITOR_TEXT,
      height: "100%",
      fontSize: "13px",
    },
    ".cm-content": {
      fontFamily: "var(--font-geist-mono), 'JetBrains Mono', monospace",
      caretColor: EDITOR_CARET,
      padding: "8px 0",
    },
    ".cm-cursor": { borderLeftColor: EDITOR_CARET },
    ".cm-activeLine": { backgroundColor: EDITOR_ACTIVE_LINE },
    ".cm-selectionBackground, ::selection": { backgroundColor: `${EDITOR_SELECTION} !important` },
    ".cm-gutters": {
      backgroundColor: EDITOR_GUTTER_BG,
      borderRight: `1px solid ${EDITOR_GUTTER_BORDER}`,
      color: EDITOR_GUTTER_TEXT,
    },
    ".cm-lineNumbers .cm-gutterElement": { paddingLeft: "8px", paddingRight: "12px" },
    ".cm-focused .cm-selectionBackground": { backgroundColor: EDITOR_SELECTION },
    ".cm-tooltip": {
      backgroundColor: EDITOR_TOOLTIP_BG,
      border: `1px solid ${EDITOR_TOOLTIP_BORDER}`,
      color: EDITOR_TEXT,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    },
    ".cm-tooltip-autocomplete ul li[aria-selected]": {
      backgroundColor: EDITOR_AUTOCOMPLETE_HOVER,
      color: EDITOR_TEXT,
    },
    ".cm-placeholder": { color: EDITOR_PLACEHOLDER },
  },
  { dark: false },
);

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
 * CodeMirror 6 SQL editor with light theme, line numbers, and Ctrl/Cmd+Enter to run.
 * Manages its own EditorView instance and syncs value externally via props.
 */
export default function SqlEditor({ value, onChange, onRun, className }: SqlEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);

  // Keep refs in sync so closures always see latest callbacks
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onRunRef.current = onRun; }, [onRun]);

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          sql(),
          lineNumbers(),
          drawSelection(),
          highlightActiveLine(),
          placeholder("Write SQL here…  Ctrl+Enter to run"),
          lightTheme,
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
