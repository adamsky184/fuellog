/**
 * v2.14.0 — minimal skeleton primitive.
 *
 * Use anywhere you'd otherwise show "Načítám…". Subtle pulse,
 * accent-aware shimmer-free (no animation jank).
 */

import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-slate-200/70 dark:bg-slate-800/60",
        className,
      )}
      {...props}
    />
  );
}

/** Quick-stack of N rectangular skeletons used in list placeholders. */
export function SkeletonList({
  rows = 3,
  height = "h-12",
}: {
  rows?: number;
  height?: string;
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`w-full ${height}`} />
      ))}
    </div>
  );
}
