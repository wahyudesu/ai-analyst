/**
 * Dynamic imports for chart components to enable code-splitting
 * Use these for better bundle size optimization
 */

import { type ComponentType, lazy } from "react"
import type { ChartConfig } from "./types"

interface DynamicChartProps {
  config: ChartConfig
  className?: string
}

// Suspense fallback component
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-muted rounded ${className || "h-64 w-full"}`}
    />
  )
}

// Lazy-loaded chart components
export const BarChart = lazy(() =>
  import("./BarChart").then(mod => ({
    default: mod.BarChart as ComponentType<DynamicChartProps>,
  }))
)

export const LineChart = lazy(() =>
  import("./LineChart").then(mod => ({
    default: mod.LineChart as ComponentType<DynamicChartProps>,
  }))
)

export const AreaChart = lazy(() =>
  import("./AreaChart").then(mod => ({
    default: mod.AreaChart as ComponentType<DynamicChartProps>,
  }))
)

export const PieChart = lazy(() =>
  import("./PieChart").then(mod => ({
    default: mod.PieChart as ComponentType<DynamicChartProps>,
  }))
)

export const FunnelChart = lazy(() =>
  import("./FunnelChart").then(mod => ({
    default: mod.FunnelChart as ComponentType<DynamicChartProps>,
  }))
)

export const StackedAreaChart = lazy(() =>
  import("./StackedAreaChart").then(mod => ({
    default: mod.StackedAreaChart as ComponentType<DynamicChartProps>,
  }))
)

export const HorizontalBarChart = lazy(() =>
  import("./HorizontalBarChart").then(mod => ({
    default: mod.HorizontalBarChart as ComponentType<DynamicChartProps>,
  }))
)

export const DualAxisChart = lazy(() =>
  import("./DualAxisChart").then(mod => ({
    default: mod.DualAxisChart as ComponentType<DynamicChartProps>,
  }))
)
