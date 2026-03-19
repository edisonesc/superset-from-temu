export default function ChartsLoading() {
  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-20 bg-zinc-800 animate-pulse rounded" />
        <div className="h-7 w-28 bg-zinc-800 animate-pulse rounded" />
      </div>
      <div className="h-9 w-72 bg-zinc-800 animate-pulse rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-zinc-800 p-4 space-y-3">
            <div className="h-5 w-32 bg-zinc-800 animate-pulse rounded" />
            <div className="h-4 w-20 bg-zinc-800 animate-pulse rounded" />
            <div className="h-3 w-28 bg-zinc-800 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
