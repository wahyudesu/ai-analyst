"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2" />
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            <div className="h-4 w-20 bg-muted animate-pulse rounded mt-3" />
          </div>
          <div className="w-11 h-11 bg-muted animate-pulse rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

export function MetricCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-muted animate-pulse rounded" />
      </CardContent>
    </Card>
  )
}

export function ChartGridSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ChartSkeleton key={i} />
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 bg-muted/50 rounded-lg">
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="h-4 w-20 bg-muted animate-pulse rounded ml-auto" />
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        <div className="h-4 w-20 bg-muted animate-pulse rounded" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-border">
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          <div className="h-4 w-20 bg-muted animate-pulse rounded ml-auto" />
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        </div>
      ))}
    </div>
  )
}

export function StatsGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="text-center p-4 bg-muted/50 rounded-lg">
          <div className="h-7 w-16 bg-muted animate-pulse rounded mx-auto mb-2" />
          <div className="h-4 w-24 bg-muted animate-pulse rounded mx-auto" />
        </div>
      ))}
    </div>
  )
}
