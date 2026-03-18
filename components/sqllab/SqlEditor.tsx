"use client";

import { useEffect, useRef } from "react";
import { EditorView, lineNumbers, drawSelection, highlightActiveLine, keymap, placeholder } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { sql } from "@codemirror/lang-sql";

// ---------------------------------------------------------------------------
// Dark theme matching the app's zinc palette
// ---------------------------------------------------------------------------

const darkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#09090b",
      color: "#e4e4e7",
      height: "100%",
      fontSize: "13px",
    },
    ".cm-content": {
      fontFamily: "var(--font-geist-mono), monospace",
      caretColor: "#a1a1aa",
      padding: "8px 0",
    },
    ".cm-cursor": { borderLeftColor: "#a1a1aa" },
    ".cm-activeLine": { backgroundColor: "#18181b" },
    ".cm-selectionBackground, ::selection": { backgroundColor: "#3f3f46 !important" },
    ".cm-gutters": {
      backgroundColor: "#09090b",
      borderRight: "1px solid #27272a",
      color: "#52525b",
    },
    ".cm-lineNumbers .cm-gutterElement": { paddingLeft: "8px", paddingRight: "8px" },
    ".cm-focused .cm-selectionBackground": { backgroundColor: "#3f3f46" },
    ".cm-tooltip": { backgroundColor: "#18181b", border: "1px solid #3f3f46", color: "#e4e4e7" },
    ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "#3f3f46" },
  },
  { dark: true },
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
 * CodeMirror 6 SQL editor with dark theme, line numbers, and Ctrl/Cmd+Enter to run.
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
          darkTheme,
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
