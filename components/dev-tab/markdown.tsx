import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import type { Components } from "react-markdown";

const components: Components = {
  h1: ({ children }) => (
    <h1
      style={{
        fontSize: "1.1em",
        fontWeight: 700,
        color: "var(--text-primary)",
        margin: "4px 0 14px",
        paddingBottom: "6px",
        borderBottom: "2px solid var(--accent)",
      }}
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      style={{
        fontSize: "0.95em",
        fontWeight: 700,
        color: "var(--text-primary)",
        margin: "18px 0 6px",
        paddingBottom: "4px",
        borderBottom: "1px solid var(--bg-border)",
      }}
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      style={{
        fontSize: "0.88em",
        fontWeight: 600,
        color: "var(--text-primary)",
        margin: "14px 0 4px",
      }}
    >
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4
      style={{
        fontSize: "0.85em",
        fontWeight: 600,
        color: "var(--text-secondary)",
        margin: "10px 0 2px",
      }}
    >
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p
      style={{
        color: "var(--text-secondary)",
        fontSize: "0.84em",
        lineHeight: "1.75",
        margin: "0 0 6px",
      }}
    >
      {children}
    </p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: "var(--accent)", textDecoration: "underline" }}
    >
      {children}
    </a>
  ),
  code: ({ children, className }) => {
    // Block code is handled by `pre` — inline code has no className
    const isInline = !className;
    if (isInline) {
      return (
        <code
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
          {children}
        </code>
      );
    }
    return (
      <code
        style={{
          fontFamily: "var(--font-mono, monospace)",
          color: "#e2e8f0",
        }}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre
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
      {children}
    </pre>
  ),
  ul: ({ children }) => (
    <ul
      style={{
        paddingLeft: "18px",
        margin: "4px 0 8px",
        listStyleType: "disc",
      }}
    >
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol
      style={{
        paddingLeft: "18px",
        margin: "4px 0 8px",
        listStyleType: "decimal",
      }}
    >
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li
      style={{
        color: "var(--text-secondary)",
        fontSize: "0.84em",
        lineHeight: "1.7",
        marginBottom: "2px",
      }}
    >
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote
      style={{
        borderLeft: "3px solid var(--accent)",
        paddingLeft: "12px",
        margin: "8px 0",
        fontStyle: "italic",
        color: "var(--text-secondary)",
      }}
    >
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr
      style={{
        border: "none",
        borderTop: "1px solid var(--bg-border)",
        margin: "14px 0",
      }}
    />
  ),
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      style={{ maxWidth: "100%", borderRadius: "4px", margin: "8px 0" }}
    />
  ),
  table: ({ children }) => (
    <div style={{ overflowX: "auto", margin: "8px 0 12px" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78em" }}
      >
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th
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
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      style={{
        padding: "5px 10px",
        color: "var(--text-secondary)",
        verticalAlign: "top",
        borderBottom: "1px solid var(--bg-border)",
      }}
    >
      {children}
    </td>
  ),
};

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div style={{ padding: "2px 0" }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
