import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-foreground/10", className)} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <Shimmer className="h-6 w-48 max-w-full" />
        <Shimmer className="mt-3 h-4 w-full max-w-md" />
        <div className="mt-5 flex flex-wrap gap-2">
          <Shimmer className="h-9 w-28" />
          <Shimmer className="h-9 w-28" />
          <Shimmer className="h-9 w-28" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <Shimmer className="h-4 w-20" />
                <Shimmer className="mt-3 h-8 w-14" />
                <Shimmer className="mt-4 h-3 w-full max-w-[8rem]" />
              </div>
              <Shimmer className="size-11 shrink-0 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-3">
          <Shimmer className="h-5 w-40" />
          <Shimmer className="mt-2 h-4 w-56" />
          <Shimmer className="mt-8 h-48 w-full rounded-xl" />
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <Shimmer className="h-5 w-36" />
          <Shimmer className="mt-6 h-12 w-full" />
          <Shimmer className="mt-4 h-12 w-full" />
          <Shimmer className="mt-4 h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
