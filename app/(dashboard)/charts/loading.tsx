export default function ChartsLoading() {
  return (
    <div className="flex flex-col h-full p-6 gap-4" style={{ background: "var(--bg-base)" }}>
      <div className="flex items-center justify-between">
        <div className="h-7 w-20 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
        <div className="h-7 w-28 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
      </div>
      <div className="h-9 w-72 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-4 space-y-3" style={{ border: "1px solid var(--bg-border)", borderRadius: "2px", background: "var(--bg-surface)" }}>
            <div className="h-5 w-32 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
            <div className="h-4 w-20 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
            <div className="h-3 w-28 animate-pulse" style={{ background: "var(--bg-border)", borderRadius: "2px" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
