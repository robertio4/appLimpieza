function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-neutral-200 ${className ?? ""}`}
    />
  );
}

export default function PresupuestosLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      {/* Filters */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-4">
        <Skeleton className="h-5 w-20" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
      {/* Table */}
      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-neutral-100">
          <div className="grid grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="p-4 border-b border-neutral-100 last:border-0"
          >
            <div className="grid grid-cols-7 gap-4">
              {Array.from({ length: 7 }).map((_, j) => (
                <Skeleton key={j} className="h-5 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
