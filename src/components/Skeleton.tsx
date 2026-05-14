/**
 * Reusable skeleton loading components for FitMetric.
 * Usage: import { SkeletonCard, SkeletonStat, SkeletonList } from "@/components/Skeleton";
 */

function pulse(className: string) {
  return `animate-pulse bg-white/5 rounded-2xl ${className}`;
}

/** A single shimmering block — base primitive */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={pulse(className)} />;
}

/** 2×2 stat cards like the Dashboard top row */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white/5 border border-white/5 rounded-3xl p-5 space-y-3">
          <Skeleton className="h-3 w-16 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** A tall card with title + body lines */
export function SkeletonCard({ lines = 4 }: { lines?: number }) {
  return (
    <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4">
      <Skeleton className="h-3 w-32 rounded-full" />
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={`h-3 rounded-full ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

/** Vertical list of rows (for exercise list, food diary, etc.) */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-2xl px-5 py-4">
          <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-3/5 rounded-full" />
            <Skeleton className="h-2 w-2/5 rounded-full" />
          </div>
          <Skeleton className="h-6 w-12 rounded-lg flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Full-page skeleton layout for Dashboard */
export function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 rounded-full" />
          <Skeleton className="h-8 w-40 rounded-xl" />
        </div>
        <Skeleton className="h-12 w-12 rounded-2xl" />
      </div>
      <SkeletonStats count={4} />
      <SkeletonCard lines={3} />
      <SkeletonList rows={4} />
    </div>
  );
}
