import { readFileSync } from "fs";
import { join } from "path";
import { DevTabFAB } from "./DevTabFAB";
import { MarkdownContent } from "./markdown";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readMd(filename: string): string {
  try {
    return readFileSync(join(process.cwd(), filename), "utf-8");
  } catch {
    return `> Could not load \`${filename}\``;
  }
}

// ---------------------------------------------------------------------------
// Config — add new items here.
// Each item gets: a tab title and a ReactNode as content.
//
// Example of adding a custom JSX item:
//   {
//     title: "API Reference",
//     content: <MyCustomComponent />,
//   }
// ---------------------------------------------------------------------------

export function DevTab() {
  const items = [
    {
      title: "Documentation/Setup",
      content: <MarkdownContent content={readMd("README.md")} />,
    },
    {
      title: "Onboarding",
      content: <MarkdownContent content={readMd("ONBOARDING.md")} />,
    },
    // ── Add more items below ──────────────────────────────────────────────
  ];

  return <DevTabFAB items={items} />;
}
