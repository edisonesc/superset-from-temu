export default function DashboardsLoading() {
  return (
    <div className="flex flex-col h-full p-6 gap-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 bg-zinc-800 animate-pulse rounded" />
        <div className="h-7 w-36 bg-zinc-800 animate-pulse rounded" />
      </div>
      <div className="h-9 w-72 bg-zinc-800 animate-pulse rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-zinc-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-36 bg-zinc-800 animate-pulse rounded" />
              <div className="h-5 w-16 bg-zinc-800 animate-pulse rounded" />
            </div>
            <div className="h-4 w-48 bg-zinc-800 animate-pulse rounded" />
            <div className="h-3 w-24 bg-zinc-800 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
