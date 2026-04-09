"use client"

import { AreaChart } from "@/components/charts/AreaChart"
import { useDashboard } from "@/components/dashboard/DashboardContext"
import { MetricCard } from "@/components/dashboard/MetricCard"
import { RefreshButton } from "@/components/dashboard/RefreshButton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useDatabaseConfig } from "@/lib/use-database-config"
import { Activity, Target, Users, Zap } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

interface UsageData {
  metrics: {
    dau: { value: number; format: string }
    mau: { value: number; format: string }
    dauMauRatio: { value: number; format: string }
    totalAgents: { value: number; format: string }
    uniqueCreators: { value: number; format: string }
  }
  charts: {
    dailyTrend: {
      labels: string[]
      dau: number[]
      conversations: number[]
      messages: number[]
    }
    sourceUsage: {
      source: string
      conversations: number
      users: number
      messages: number
    }[]
  }
}

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const { databaseUrl } = useDatabaseConfig()
  const { setHeaderActions } = useDashboard()

  // Use ref to avoid recreating fetchData when databaseUrl changes
  const databaseUrlRef = useRef(databaseUrl)
  databaseUrlRef.current = databaseUrl

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await fetch("/api/dashboard/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseUrl: databaseUrlRef.current || undefined,
        }),
      })
      if (response.ok) {
        const result = await response.json()
        setData(result)
        setLastRefresh(new Date())
      }
    } catch (error) {
      console.error("Failed to fetch usage data:", error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  const handleRefresh = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  // Set header actions
  useEffect(() => {
    setHeaderActions(
      <RefreshButton
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        lastRefresh={lastRefresh}
      />
    )
  }, [setHeaderActions, handleRefresh, isRefreshing, lastRefresh])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <main className="p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-[repeat(4,minmax(140px,1fr))] gap-3">
          <MetricCard
            title="DAU (Today)"
            value={data?.metrics.dau.value || 0}
            icon={Activity}
            format="number"
          />
          <MetricCard
            title="MAU (last 30 days)"
            value={data?.metrics.mau.value || 0}
            icon={Users}
            format="number"
          />
          <MetricCard
            title="DAU/MAU"
            value={data?.metrics.dauMauRatio.value || 0}
            icon={Target}
            format="percentage"
          />
          <MetricCard
            title="Total Agents"
            value={data?.metrics.totalAgents.value || 0}
            icon={Zap}
            format="number"
          />
        </div>

        {/* DAU/MAU Gauge & Source Usage - 2 Cards in Row */}
        <div className="grid grid-cols-[280px_1fr] gap-4">
          {/* DAU/MAU Gauge - Compact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                User Stickiness (DAU/MAU)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4">
                <div className="relative w-28 h-28 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      stroke="currentColor"
                      strokeWidth="10"
                      fill="none"
                      className="text-zinc-200 dark:text-zinc-800"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      stroke="currentColor"
                      strokeWidth="10"
                      fill="none"
                      strokeDasharray={`${(data?.metrics.dauMauRatio.value || 0) * 3.01} 302`}
                      className="text-primary"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                      {(data?.metrics.dauMauRatio.value || 0).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400">
                      {(data?.metrics.dauMauRatio.value || 0) > 25
                        ? "Excellent"
                        : (data?.metrics.dauMauRatio.value || 0) > 15
                          ? "Good"
                          : "Fair"}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  <p className="text-zinc-500">
                    <span className="font-medium text-green-600 dark:text-green-400">
                      25%+
                    </span>{" "}
                    Excellent
                  </p>
                  <p className="text-zinc-500">
                    <span className="font-medium text-primary">15-25%</span>{" "}
                    Good
                  </p>
                  <p className="text-zinc-500">
                    <span className="font-medium text-primary/60">&lt;15%</span>{" "}
                    Fair
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Source Usage Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Source Usage Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="text-left py-2 px-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Source
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Conv.
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Users
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        Msgs
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.charts.sourceUsage.slice(0, 4).map((source, i) => (
                      <tr
                        key={i}
                        className="border-b border-zinc-100 dark:border-zinc-800/50"
                      >
                        <td className="py-2 px-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 dark:bg-primary/20 text-primary capitalize">
                            {source.source}
                          </span>
                        </td>
                        <td className="text-right py-2 px-2 text-sm text-zinc-900 dark:text-zinc-50">
                          {source.conversations.toLocaleString()}
                        </td>
                        <td className="text-right py-2 px-2 text-sm text-zinc-900 dark:text-zinc-50">
                          {source.users.toLocaleString()}
                        </td>
                        <td className="text-right py-2 px-2 text-sm text-zinc-900 dark:text-zinc-50">
                          {source.messages.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Active Users Trend */}
        <Card className="min-h-[350px]">
          <CardHeader>
            <CardTitle>Daily Active Users Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-zinc-500">Loading...</p>
              </div>
            ) : data && data.charts.dailyTrend.labels.length > 0 ? (
              <AreaChart
                className="h-full"
                config={{
                  chartType: "line",
                  title: "Daily Active Users (30 Days)",
                  data: {
                    series: [
                      {
                        name: "DAU",
                        data: data.charts.dailyTrend.labels.map((label, i) => ({
                          x: label,
                          y: data.charts.dailyTrend.dau[i],
                        })),
                        color: "#14B8A6",
                      },
                    ],
                  },
                  xAxis: { label: "Date", type: "category" },
                  yAxis: [{ label: "Users" }],
                  options: {
                    legend: false,
                    stacked: false,
                    horizontal: false,
                    showDataLabels: false,
                  },
                  colors: { palette: ["#14B8A6"] },
                  metadata: {
                    dataSourceRowCount: data.charts.dailyTrend.labels.length,
                    displayedPointCount: data.charts.dailyTrend.labels.length,
                    generatedAt: new Date().toISOString(),
                  },
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-zinc-500">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
