export default function DatasetsLoading() {
  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 bg-zinc-800 animate-pulse rounded" />
        <div className="h-7 w-28 bg-zinc-800 animate-pulse rounded" />
      </div>
      <div className="h-9 w-72 bg-zinc-800 animate-pulse rounded" />
      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <div className="h-10 bg-zinc-900 border-b border-zinc-800" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-zinc-800 last:border-0">
            <div className="h-4 w-40 bg-zinc-800 animate-pulse rounded" />
            <div className="h-5 w-16 bg-zinc-800 animate-pulse rounded" />
            <div className="h-4 w-32 bg-zinc-800 animate-pulse rounded" />
            <div className="h-4 w-24 bg-zinc-800 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
