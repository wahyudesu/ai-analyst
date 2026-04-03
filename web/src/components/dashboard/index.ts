// Dashboard components - barrel export
// Use specific imports instead of barrel imports for better tree-shaking:
// import { MetricCard } from '@/components/dashboard/MetricCard'  // ✅ Better
// import { MetricCard } from '@/components/dashboard'            // ❌ Avoid

export { DashboardHeader } from "./DashboardHeader"
export { MetricCard } from "./MetricCard"
export { RefreshButton } from "./RefreshButton"
export { SidebarNav } from "./SidebarNav"
export {
  TimelineFilter,
  type TimeRange,
  type TimeRangeOption,
  timeRangeToInterval,
} from "./TimelineFilter"
export {
  ComparisonToggle,
  type ComparisonMode,
  type ComparisonOption,
  comparisonModeToInterval,
  getPreviousPeriodOffset,
} from "./ComparisonToggle"

// Skeleton components
export { MetricCardGridSkeleton, ChartSkeleton } from "./Skeleton"

// Types
export type { MetricCardProps } from "./MetricCard"
