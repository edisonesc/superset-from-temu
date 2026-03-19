import React from "react";

// ---------------------------------------------------------------------------
// Inline parser — handles **bold**, *em*, `code`, [text](url)
// ---------------------------------------------------------------------------

function parseInline(text: string): React.ReactNode[] {
  const pattern =
    /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\n]+\))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={match.index} style={{ fontWeight: 600, color: "var(--text-primary)" }}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*")) {
      parts.push(
        <em key={match.index} style={{ fontStyle: "italic" }}>
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={match.index}
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--bg-border)",
            padding: "1px 5px",
            borderRadius: "3px",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "0.82em",
            color: "var(--accent-deep)",
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={match.index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)", textDecoration: "underline" }}
          >
            {linkMatch[1]}
          </a>
        );
      }
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : [text];
}

// ---------------------------------------------------------------------------
// Block parser
// ---------------------------------------------------------------------------

export function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  const k = () => key++;

  while (i < lines.length) {
    const line = lines[i];

    // HTML comments — skip until closing -->
    if (line.trimStart().startsWith("<!--")) {
      while (i < lines.length && !lines[i].includes("-->")) i++;
      i++;
      continue;
    }

    // Fenced code block
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre
          key={k()}
          style={{
            background: "#1e293b",
            border: "1px solid var(--bg-border)",
            padding: "12px 14px",
            borderRadius: "4px",
            overflowX: "auto",
            fontSize: "0.78em",
            lineHeight: "1.65",
            margin: "8px 0 12px",
            fontFamily: "var(--font-mono, monospace)",
            color: "#e2e8f0",
            whiteSpace: "pre",
          }}
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---") {
      elements.push(
        <hr
          key={k()}
          style={{
            border: "none",
            borderTop: "1px solid var(--bg-border)",
            margin: "14px 0",
          }}
        />
      );
      i++;
      continue;
    }

    // H1
    const h1 = line.match(/^# (.+)$/);
    if (h1) {
      elements.push(
        <h1
          key={k()}
          style={{
            fontSize: "1.1em",
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: "4px 0 14px",
            paddingBottom: "6px",
            borderBottom: "2px solid var(--accent)",
          }}
        >
          {parseInline(h1[1])}
        </h1>
      );
      i++;
      continue;
    }

    // H2
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      elements.push(
        <h2
          key={k()}
          style={{
            fontSize: "0.95em",
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: "18px 0 6px",
            paddingBottom: "4px",
            borderBottom: "1px solid var(--bg-border)",
          }}
        >
          {parseInline(h2[1])}
        </h2>
      );
      i++;
      continue;
    }

    // H3
    const h3 = line.match(/^### (.+)$/);
    if (h3) {
      elements.push(
        <h3
          key={k()}
          style={{
            fontSize: "0.88em",
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: "14px 0 4px",
          }}
        >
          {parseInline(h3[1])}
        </h3>
      );
      i++;
      continue;
    }

    // H4
    const h4 = line.match(/^#### (.+)$/);
    if (h4) {
      elements.push(
        <h4
          key={k()}
          style={{
            fontSize: "0.85em",
            fontWeight: 600,
            color: "var(--text-secondary)",
            margin: "10px 0 2px",
          }}
        >
          {parseInline(h4[1])}
        </h4>
      );
      i++;
      continue;
    }

    // Table — collect consecutive pipe rows
    if (line.startsWith("|") && line.trim().endsWith("|")) {
      const rows: string[][] = [];
      while (
        i < lines.length &&
        lines[i].startsWith("|") &&
        lines[i].trim().endsWith("|")
      ) {
        rows.push(
          lines[i]
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim())
        );
        i++;
      }
      // Remove separator rows (cells are only dashes/colons/spaces)
      const data = rows.filter(
        (row) => !row.every((c) => /^[-:| ]+$/.test(c))
      );
      if (data.length === 0) continue;
      const [header, ...body] = data;
      elements.push(
        <div key={k()} style={{ overflowX: "auto", margin: "8px 0 12px" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.78em",
            }}
          >
            <thead>
              <tr>
                {header.map((cell, ci) => (
                  <th
                    key={ci}
                    style={{
                      textAlign: "left",
                      padding: "5px 10px",
                      background: "var(--bg-elevated)",
                      borderBottom: "2px solid var(--bg-border)",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {parseInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr
                  key={ri}
                  style={{ borderBottom: "1px solid var(--bg-border)" }}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      style={{
                        padding: "5px 10px",
                        color: "var(--text-secondary)",
                        verticalAlign: "top",
                      }}
                    >
                      {parseInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Unordered list — collect consecutive
    if (line.match(/^[-*] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul
          key={k()}
          style={{ paddingLeft: "18px", margin: "4px 0 8px", listStyleType: "disc" }}
        >
          {items.map((item, ii) => (
            <li
              key={ii}
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.84em",
                lineHeight: "1.7",
                marginBottom: "2px",
              }}
            >
              {parseInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list — collect consecutive
    if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol
          key={k()}
          style={{ paddingLeft: "18px", margin: "4px 0 8px", listStyleType: "decimal" }}
        >
          {items.map((item, ii) => (
            <li
              key={ii}
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.84em",
                lineHeight: "1.7",
                marginBottom: "2px",
              }}
            >
              {parseInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Blank line — skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    elements.push(
      <p
        key={k()}
        style={{
          color: "var(--text-secondary)",
          fontSize: "0.84em",
          lineHeight: "1.75",
          margin: "0 0 6px",
        }}
      >
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return <div style={{ padding: "2px 0" }}>{elements}</div>;
}
