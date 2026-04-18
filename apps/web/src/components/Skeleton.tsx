/**
 * Skeleton loader components for the Finetra dashboard.
 * Uses a pulsing shimmer animation to indicate loading state.
 */

import React from 'react';

/** Base shimmer block — all skeleton elements are built from this */
export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`shimmer rounded-xl ${className}`} />
  );
}

/** 4-card stats row skeleton */
export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card p-6 space-y-4">
          <Shimmer className="w-14 h-14 rounded-2xl" />
          <Shimmer className="w-24 h-3 rounded" />
          <Shimmer className="w-32 h-7 rounded-lg" />
          <Shimmer className="w-20 h-3 rounded" />
        </div>
      ))}
    </div>
  );
}

/** AI insights card skeleton */
export function InsightCardSkeleton() {
  return (
    <div className="card p-8 space-y-4">
      <div className="flex items-center gap-3">
        <Shimmer className="w-11 h-11 rounded-2xl" />
        <Shimmer className="w-48 h-5 rounded" />
      </div>
      <div className="rounded-2xl p-6 space-y-2" style={{ background: 'var(--bg-elevated)' }}>
        <Shimmer className="w-full h-3 rounded" />
        <Shimmer className="w-5/6 h-3 rounded" />
        <Shimmer className="w-4/6 h-3 rounded" />
      </div>
    </div>
  );
}

/** Chart area skeleton — used for area/bar charts */
export function ChartSkeleton({ height = "h-48" }: { height?: string }) {
  const barHeights = ["h-[40%]", "h-[65%]", "h-[50%]", "h-[80%]", "h-[55%]", "h-[90%]", "h-[70%]", "h-[45%]", "h-[85%]", "h-[60%]", "h-[75%]", "h-[95%]"];
  return (
    <div className={`${height} flex items-end gap-1 px-4 pb-4`}>
      {barHeights.map((h, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end">
          <Shimmer className={`w-full rounded-t-md ${h}`} />
        </div>
      ))}
    </div>
  );
}

/** Chart card wrapper skeleton — title + chart area */
export function ChartCardSkeleton({ height = "h-48" }: { height?: string }) {
  return (
    <div className="card p-6 space-y-4">
      <Shimmer className="w-40 h-4 rounded" />
      <ChartSkeleton height={height} />
    </div>
  );
}

/** Table skeleton — header + N rows */
export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden" style={{ borderRadius: 16 }}>
      <div className="px-5 py-4 flex gap-4" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
        {[...Array(cols)].map((_, i) => <Shimmer key={i} className="flex-1 h-3 rounded" />)}
      </div>
      {[...Array(rows)].map((_, r) => (
        <div key={r} className="px-5 py-4 flex gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
          {[...Array(cols)].map((_, c) => <Shimmer key={c} className={`flex-1 h-3 rounded ${c === 0 ? 'w-32' : ''}`} />)}
        </div>
      ))}
    </div>
  );
}

/** Full cashflow page skeleton — shown while year data is loading */
export function CashflowPageSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <StatCardsSkeleton />
      <InsightCardSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCardSkeleton height="h-56" />
        <ChartCardSkeleton height="h-56" />
      </div>
      <ChartCardSkeleton height="h-40" />
      <TableSkeleton rows={8} cols={7} />
      <TableSkeleton rows={6} cols={7} />
    </div>
  );
}
