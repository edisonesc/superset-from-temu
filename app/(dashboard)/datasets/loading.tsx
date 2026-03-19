export default function DatasetsLoading() {
  return (
    <div className="flex flex-col h-full p-6 gap-4" style={{ background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
        <div className="h-7 w-28 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
      </div>
      <div className="h-9 w-72 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
      <div style={{ border: "1px solid var(--bg-border)", borderRadius: "2px", overflow: "hidden" }}>
        <div className="h-10" style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--bg-border)" }} />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3" style={{ borderBottom: "1px solid var(--bg-border)", background: i % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)" }}>
            <div className="h-4 w-40 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
            <div className="h-5 w-16 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
            <div className="h-4 w-32 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
            <div className="h-4 w-24 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
