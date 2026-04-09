"use client"

import { AreaChart } from "@/components/charts/AreaChart"
import { BarChart } from "@/components/charts/BarChart"
import { LineChart } from "@/components/charts/LineChart"
import type { ChartConfig } from "@/components/charts/types"
import type { ComparisonMode } from "@/components/dashboard/ComparisonToggle"
import { useDashboard } from "@/components/dashboard/DashboardContext"
import {
  MetricCard,
  type SparklineData,
} from "@/components/dashboard/MetricCard"
import { RefreshButton } from "@/components/dashboard/RefreshButton"
import {
  ChartSkeleton,
  MetricCardGridSkeleton,
  MetricCardSkeleton,
} from "@/components/dashboard/Skeleton"
import {
  type TimeRange,
  TimelineFilter,
} from "@/components/dashboard/TimelineFilter"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useDashboardCache } from "@/hooks/useDashboardCache"
import { useDatabaseConfig } from "@/lib/use-database-config"
import {
  AlertCircle,
  Bot,
  CreditCard,
  MessageSquare,
  RefreshCw,
  Send,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

interface OverviewData {
  metrics: {
    totalUsers: {
      value: number
      format: string
      change: number
      current?: number
      previous?: number
    }
    totalAgents: { value: number; format: string }
    totalConversations: { value: number; format: string }
    totalMessages: { value: number; format: string }
    activeSubscriptions: { value: number; format: string }
    messagesLast30Days: {
      value: number
      format: string
      current?: number
      previous?: number
      change?: number
    }
    conversationsLast30Days: {
      value: number
      format: string
      current?: number
      previous?: number
      change?: number
    }
    activatedUsers: { value: number; format: string }
    userGrowthRate: {
      value: number
      format: string
      current?: number
      previous?: number
      change?: number
    }
    activationRate: { value: number; format: string }
  }
  charts: {
    newUsersOverTime: {
      labels: string[]
      values: number[]
    }
    conversationsOverTime: {
      labels: string[]
      values: number[]
    }
    messagesOverTime: {
      labels: string[]
      values: number[]
    }
    agentsByModel: Array<{ model: string; count: number }>
    subscriptionsByPlan: Array<{ plan: string; count: number }>
  }
  meta?: {
    timeRange: TimeRange
    comparisonMode: ComparisonMode
  }
}

export default function OverviewPage() {
  const {
    getCachedData,
    setCachedData,
    isCacheValid,
    clearCache,
    getLastRefreshTime,
  } = useDashboardCache<OverviewData>({ ttl: 24 * 60 * 60 * 1000 }) // 1 day TTL

  // Check cache IMMEDIATELY (before useEffect) to avoid loading flash
  const cachedData = getCachedData()
  const cacheValid = isCacheValid()

  // New state for timeline
  const [timeRange, setTimeRange] = useState<TimeRange>("30d")

  const [data, setData] = useState<OverviewData | null>(
    cachedData && cacheValid ? cachedData : null
  )
  // Initial loading - only true on first load when no cache
  const [initialLoading, setInitialLoading] = useState(!cachedData || !cacheValid)
  // Refreshing state - true when updating data after filter change
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Track which sections are currently loading
  const [refreshingSections, setRefreshingSections] = useState<Set<keyof OverviewData['charts']> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { databaseUrl } = useDatabaseConfig()
  const { setHeaderActions } = useDashboard()

  // Use ref to avoid recreating fetchFromAPI when databaseUrl changes
  const databaseUrlRef = useRef(databaseUrl)
  databaseUrlRef.current = databaseUrl

  const fetchFromAPI = useCallback(
    async (bypassCache = false): Promise<OverviewData | null> => {
      try {
        setError(null)
        const response = await fetch("/api/dashboard/overview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            databaseUrl: databaseUrlRef.current || undefined,
            timeRange,
            comparisonMode: "mom",
          }),
          cache: bypassCache ? "no-store" : "default",
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`)
        }
        const result = await response.json()
        if (result.error) {
          throw new Error(result.error)
        }
        return result
      } catch (error) {
        console.error("Failed to fetch overview data:", error)
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error"
        setError(errorMessage)
        return null
      }
    },
    [timeRange]
  )

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const freshData = await fetchFromAPI(true)
      if (freshData) {
        setData(freshData)
        setCachedData(freshData)
      }
      // If error occurs, we keep the existing data (from cache)
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchFromAPI, setCachedData, databaseUrl])

  useEffect(() => {
    // Skip if we're manually refreshing
    if (isRefreshing) return

    async function loadData() {
      // For initial load, show skeleton
      if (!data) {
        setInitialLoading(true)
      }
      // Set refreshing state when changing time range with existing data
      if (data) {
        setIsRefreshing(true)
        setRefreshingSections(new Set(['newUsersOverTime', 'conversationsOverTime', 'messagesOverTime']))
      }

      const freshData = await fetchFromAPI()
      if (freshData) {
        setData(freshData)
        setCachedData(freshData)
      }
      setInitialLoading(false)
      setIsRefreshing(false)
      setRefreshingSections(null)
    }
    loadData()
  }, [timeRange]) // Refetch when timeRange changes

  // Set header actions
  useEffect(() => {
    setHeaderActions(
      <div className="flex items-center gap-3">
        <TimelineFilter value={timeRange} onChange={setTimeRange} />
        {!initialLoading && (
          <RefreshButton
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            lastRefresh={getLastRefreshTime()}
          />
        )}
      </div>
    )
  }, [
    setHeaderActions,
    timeRange,
    initialLoading,
    handleRefresh,
    isRefreshing,
    getLastRefreshTime,
  ])

  if (error) {
    return (
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-destructive/50 shadow-sm">
            <CardContent>
              <div className="text-center">
                <AlertCircle className="w-14 h-14 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Failed to load dashboard data
                </h3>
                <p className="text-sm text-muted-foreground mb-6">{error}</p>
                <Button onClick={handleRefresh} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }

  // Wrapper component for metric cards with skeleton on refresh
  const RefreshableMetricCard = ({ children, showSkeleton }: { children: React.ReactNode; showSkeleton?: boolean }) => {
    if (showSkeleton && isRefreshing) {
      return <MetricCardSkeleton />
    }
    return children
  }

  // Wrapper component for charts with skeleton on refresh
  const RefreshableChart = ({ children, showSkeleton }: { children: React.ReactNode; showSkeleton?: boolean }) => {
    if (showSkeleton && isRefreshing) {
      return (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent className="min-h-[200px]">
            <div className="h-full bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      )
    }
    return children
  }

  // Helper for chart title based on time range
  const getTimeRangeLabel = (range: TimeRange): string => {
    if (range === "all") return "All Time"
    const labels: Record<TimeRange, string> = {
      "7d": "7 Days",
      "30d": "30 Days",
      "90d": "90 Days",
      "12w": "12 Weeks",
      custom: "Custom Range",
      all: "All Time",
    }
    return labels[range] || "30 Days"
  }

  // Chart configurations - memoized to prevent re-renders
  const usersChartConfig: ChartConfig | null = useMemo(() => {
    if (!data || data.charts.newUsersOverTime.labels.length === 0) return null
    return {
      chartType: "line",
      title: `New Users (12 Weeks)`,
      data: {
        series: [
          {
            name: "New Users",
            data: data.charts.newUsersOverTime.labels.map((label, i) => ({
              x: label,
              y: data.charts.newUsersOverTime.values[i],
            })),
            color: "var(--primary)",
          },
        ],
      },
      xAxis: {
        label: "Week",
        type: "category",
      },
      yAxis: [{ label: "Users" }],
      options: {
        legend: false,
        stacked: false,
        horizontal: false,
        showDataLabels: false,
      },
      colors: {
        palette: ["var(--primary)", "var(--secondary)", "var(--accent)"],
      },
      metadata: {
        dataSourceRowCount: data.charts.newUsersOverTime.labels.length,
        displayedPointCount: data.charts.newUsersOverTime.labels.length,
        generatedAt: new Date().toISOString(),
      },
    }
  }, [
    data?.charts.newUsersOverTime.labels,
    data?.charts.newUsersOverTime.values,
  ])

  const conversationsChartConfig: ChartConfig | null = useMemo(() => {
    if (!data || data.charts.conversationsOverTime.labels.length === 0)
      return null
    return {
      chartType: "bar",
      title: `Conversations (12 Weeks)`,
      data: {
        series: [
          {
            name: "Conversations",
            data: data.charts.conversationsOverTime.labels.map((label, i) => ({
              x: label,
              y: data.charts.conversationsOverTime.values[i],
            })),
            color: "var(--secondary)",
          },
        ],
      },
      xAxis: { label: "Week", type: "category" },
      yAxis: [{ label: "Conversations" }],
      options: {
        legend: false,
        stacked: false,
        horizontal: false,
        showDataLabels: false,
      },
      colors: {
        palette: ["var(--primary)", "var(--secondary)", "var(--accent)"],
      },
      metadata: {
        dataSourceRowCount: data.charts.conversationsOverTime.labels.length,
        displayedPointCount: data.charts.conversationsOverTime.labels.length,
        generatedAt: new Date().toISOString(),
      },
    }
  }, [
    data?.charts.conversationsOverTime.labels,
    data?.charts.conversationsOverTime.values,
  ])

  const messagesChartConfig: ChartConfig | null = useMemo(() => {
    if (!data || data.charts.messagesOverTime.labels.length === 0) return null
    return {
      chartType: "line",
      title: `Messages (12 Weeks)`,
      data: {
        series: [
          {
            name: "Messages",
            data: data.charts.messagesOverTime.labels.map((label, i) => ({
              x: label,
              y: data.charts.messagesOverTime.values[i],
            })),
            color: "var(--accent)",
          },
        ],
      },
      xAxis: { label: "Week", type: "category" },
      yAxis: [{ label: "Messages" }],
      options: {
        legend: false,
        stacked: false,
        horizontal: false,
        showDataLabels: false,
      },
      colors: {
        palette: ["var(--primary)", "var(--secondary)", "var(--accent)"],
      },
      metadata: {
        dataSourceRowCount: data.charts.messagesOverTime.labels.length,
        displayedPointCount: data.charts.messagesOverTime.labels.length,
        generatedAt: new Date().toISOString(),
      },
    }
  }, [
    data?.charts.messagesOverTime.labels,
    data?.charts.messagesOverTime.values,
  ])

  const agentsChartConfig: ChartConfig | null = useMemo(() => {
    if (!data || data.charts.agentsByModel.length === 0) return null
    return {
      chartType: "bar",
      title: "Agents by Model",
      data: {
        series: [
          {
            name: "Agents",
            data: data.charts.agentsByModel.map(item => ({
              x: item.model,
              y: item.count,
            })),
            color: "var(--primary)",
          },
        ],
      },
      xAxis: { label: "Model", type: "category" },
      yAxis: [{ label: "Count" }],
      options: {
        legend: false,
        stacked: false,
        horizontal: true,
        showDataLabels: false,
      },
      colors: {
        palette: ["var(--primary)", "var(--secondary)", "var(--accent)"],
      },
      metadata: {
        dataSourceRowCount: data.charts.agentsByModel.length,
        displayedPointCount: data.charts.agentsByModel.length,
        generatedAt: new Date().toISOString(),
      },
    }
  }, [data?.charts.agentsByModel])

  const subscriptionsChartConfig: ChartConfig | null = useMemo(() => {
    if (!data || data.charts.subscriptionsByPlan.length === 0) return null
    return {
      chartType: "bar",
      title: "Total Active Subscriptions",
      data: {
        series: [
          {
            name: "Subscriptions",
            data: data.charts.subscriptionsByPlan.map(item => ({
              x: item.plan,
              y: item.count,
            })),
            color: "var(--chart-4)",
          },
        ],
      },
      xAxis: { label: "Plan", type: "category" },
      yAxis: [{ label: "Count" }],
      options: {
        legend: false,
        stacked: false,
        horizontal: true,
        showDataLabels: false,
      },
      colors: {
        palette: [
          "var(--primary)",
          "var(--secondary)",
          "var(--accent)",
          "var(--chart-4)",
        ],
      },
      metadata: {
        dataSourceRowCount: data.charts.subscriptionsByPlan.length,
        displayedPointCount: data.charts.subscriptionsByPlan.length,
        generatedAt: new Date().toISOString(),
      },
    }
  }, [data?.charts.subscriptionsByPlan])

  return (
    <main className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {initialLoading ? (
          <>
            <MetricCardGridSkeleton count={6} />
            <ChartSkeleton />
          </>
        ) : (
          <>
            {/* Metric Cards Grid - Top Row */}
            <div className="grid grid-cols-5 gap-3">
              <MetricCard
                title="Total Users"
                value={data?.metrics.totalUsers.value || 0}
                change={data?.metrics.totalUsers.change}
                previousValue={data?.metrics.totalUsers.previous}
                icon={Users}
                format="number"
              />
              <MetricCard
                title="Total Agents"
                value={data?.metrics.totalAgents.value || 0}
                icon={Bot}
                format="number"
              />
              <MetricCard
                title="Total Conversations"
                value={data?.metrics.totalConversations.value || 0}
                icon={MessageSquare}
                format="number"
              />
              <MetricCard
                title="Total Messages"
                value={data?.metrics.totalMessages.value || 0}
                icon={Send}
                format="number"
              />
              <MetricCard
                title="Total Active Subscriptions"
                value={data?.metrics.activeSubscriptions.value || 0}
                icon={CreditCard}
                format="number"
              />
            </div>

            {/* Metric Cards Grid - Bottom Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <RefreshableMetricCard showSkeleton>
                <MetricCard
                  title={`Messages (${timeRange === "all" ? "All" : timeRange})`}
                  value={data?.metrics.messagesLast30Days.value || 0}
                  change={data?.metrics.messagesLast30Days.change}
                  previousValue={data?.metrics.messagesLast30Days.previous}
                  icon={Zap}
                  format="number"
                  showPreviousValue={false}
                  sparkline={
                    data?.charts.messagesOverTime.values
                      ? {
                          data: data.charts.messagesOverTime.values,
                          color: "auto",
                        }
                      : undefined
                  }
                />
              </RefreshableMetricCard>
              <RefreshableMetricCard showSkeleton>
                <MetricCard
                  title={`Conversations (${timeRange === "all" ? "All" : timeRange})`}
                  value={data?.metrics.conversationsLast30Days.value || 0}
                  change={data?.metrics.conversationsLast30Days.change}
                  previousValue={data?.metrics.conversationsLast30Days.previous}
                  icon={MessageSquare}
                  format="number"
                  showPreviousValue={false}
                  sparkline={
                    data?.charts.conversationsOverTime.values
                      ? {
                          data: data.charts.conversationsOverTime.values,
                          color: "auto",
                        }
                      : undefined
                  }
                />
              </RefreshableMetricCard>
              <RefreshableMetricCard showSkeleton>
                <MetricCard
                  title="User Growth"
                  value={
                    Math.round((data?.metrics.userGrowthRate.value || 0) * 10) /
                    10
                  }
                  change={data?.metrics.userGrowthRate.change}
                  previousValue={data?.metrics.totalUsers.previous}
                  icon={TrendingUp}
                  format="percentage"
                  showPreviousValue={false}
                  sparkline={
                    data?.charts.newUsersOverTime.values
                      ? {
                          data: data.charts.newUsersOverTime.values,
                          color: "auto",
                        }
                      : undefined
                  }
                />
              </RefreshableMetricCard>
              {/* Activation Rate Card */}
              {isRefreshing ? (
                <MetricCardSkeleton />
              ) : (
                <Card className="border-border/50 hover:shadow-md hover:border-primary/20 transition-all duration-200">
                  <CardContent>
                    <div className="flex flex-col gap-2.5 h-full justify-center">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-muted-foreground/70" />
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                          Activation Rate
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-lg sm:text-xl font-bold text-foreground leading-tight tracking-tight tabular-nums">
                            {Math.round(
                              (data?.metrics.activationRate.value || 0) * 10
                            ) / 10}
                            %
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {data?.metrics.activatedUsers.value || 0} of{" "}
                            {data?.metrics.totalUsers.value || 0}
                          </p>
                        </div>
                        <Progress
                          value={data?.metrics.activationRate.value || 0}
                          className="h-3"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RefreshableChart showSkeleton>
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      New Users (12 Weeks)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="min-h-[200px] p-0">
                    {usersChartConfig ? (
                      <LineChart config={usersChartConfig} />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">
                          No data available
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </RefreshableChart>
              <RefreshableChart showSkeleton>
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Conversations (12 Weeks)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="min-h-[200px] p-0">
                    {conversationsChartConfig ? (
                      <BarChart config={conversationsChartConfig} />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">
                          No data available
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </RefreshableChart>
            </div>

            {/* Messages Chart */}
            <RefreshableChart showSkeleton>
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Messages (12 Weeks)</CardTitle>
                </CardHeader>
                <CardContent className="h-40 p-0">
                  {messagesChartConfig ? (
                    <AreaChart config={messagesChartConfig} />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground text-sm">
                        No data available
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </RefreshableChart>
          </>
        )}
      </div>
    </main>
  )
}
