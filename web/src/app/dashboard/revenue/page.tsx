"use client"

import { AreaChart } from "@/components/charts/AreaChart"
import { BarChart } from "@/components/charts/BarChart"
import { FunnelChart } from "@/components/charts/FunnelChart"
import { LineChart } from "@/components/charts/LineChart"
import { StackedAreaChart } from "@/components/charts/StackedAreaChart"
import type { ChartConfig } from "@/components/charts/types"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { MetricCard } from "@/components/dashboard/MetricCard"
import { RefreshButton } from "@/components/dashboard/RefreshButton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useDatabaseConfig } from "@/lib/use-database-config"
import { DollarSign, Repeat, TrendingUp, Users } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

interface RevenueData {
  metrics: {
    grossBookings: { value: number; format: string }
    mau: { value: number; format: string }
    arpu: { value: number; format: string }
    nrr: { value: number; format: string }
  }
  charts: {
    mrrByPlan: { plan: string; mrr: number; subscribers: number }[]
    funnel: { name: string; value: number }[]
    engagement: {
      labels: string[]
      conversations: number[]
      messages: number[]
    }
  }
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const { databaseUrl } = useDatabaseConfig()

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
      const response = await fetch("/api/dashboard/revenue", {
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
      console.error("Failed to fetch revenue data:", error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  const handleRefresh = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const mrrByPlanConfig: ChartConfig | null = useMemo(() => {
    if (!data || data.charts.mrrByPlan.length === 0) return null
    return {
      chartType: "area",
      title: "MRR by Plan Type",
      data: {
        series: data.charts.mrrByPlan.map(p => ({
          name: p.plan.charAt(0).toUpperCase() + p.plan.slice(1),
          data: [{ x: p.plan, y: p.mrr }],
          color:
            p.plan === "starter"
              ? "#14B8A6"
              : p.plan === "pro"
                ? "#10B981"
                : "#F97316",
        })),
      },
      xAxis: { label: "Plan", type: "category" },
      yAxis: [{ label: "MRR ($)" }],
      options: {
        legend: true,
        stacked: true,
        horizontal: false,
        showDataLabels: false,
      },
      colors: { palette: ["#14B8A6", "#10B981", "#F97316"] },
      metadata: {
        dataSourceRowCount: data.charts.mrrByPlan.length,
        displayedPointCount: data.charts.mrrByPlan.length,
        generatedAt: new Date().toISOString(),
      },
    }
  }, [data?.charts.mrrByPlan])

  const funnelConfig: ChartConfig | null = useMemo(() => {
    if (!data || data.charts.funnel.length === 0) return null
    return {
      chartType: "bar",
      title: "Customer Funnel",
      data: {
        series: [
          {
            name: "Users",
            data: data.charts.funnel.map(f => ({ x: f.name, y: f.value })),
          },
        ],
      },
      xAxis: { label: "Stage", type: "category" },
      yAxis: [{ label: "Users" }],
      options: {
        legend: false,
        stacked: false,
        horizontal: true,
        showDataLabels: true,
      },
      colors: { palette: ["#14B8A6", "#10B981", "#F97316"] },
      metadata: {
        dataSourceRowCount: data.charts.funnel.length,
        displayedPointCount: data.charts.funnel.length,
        generatedAt: new Date().toISOString(),
      },
    }
  }, [data?.charts.funnel])

  const engagementConfig: ChartConfig | null = useMemo(() => {
    if (
      !data ||
      data.charts.engagement.labels.length === 0 ||
      !data.charts.engagement.conversations?.length
    )
      return null
    return {
      chartType: "area",
      title: "Product Engagement",
      data: {
        series: [
          {
            name: "Conversations",
            data: data.charts.engagement.labels.map((label, i) => ({
              x: label,
              y: data.charts.engagement.conversations[i],
            })),
            color: "#14B8A6",
          },
          {
            name: "Messages",
            data: data.charts.engagement.labels.map((label, i) => ({
              x: label,
              y: data.charts.engagement.messages[i],
            })),
            color: "#10B981",
          },
        ],
      },
      xAxis: { label: "Week", type: "category" },
      yAxis: [{ label: "Count" }],
      options: {
        legend: true,
        stacked: false,
        horizontal: false,
        showDataLabels: false,
      },
      colors: { palette: ["#14B8A6", "#10B981"] },
      metadata: {
        dataSourceRowCount: data.charts.engagement.labels.length,
        displayedPointCount: data.charts.engagement.labels.length,
        generatedAt: new Date().toISOString(),
      },
    }
  }, [
    data?.charts.engagement.labels,
    data?.charts.engagement.conversations,
    data?.charts.engagement.messages,
  ])

  return (
    <div className="flex flex-col">
      <DashboardHeader
        title="Revenue & Monetization"
        subtitle="Revenue metrics and monetization analytics"
        actions={
          <RefreshButton
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            lastRefresh={lastRefresh}
          />
        }
      />

      <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Gross Bookings (30d)"
              value={data?.metrics.grossBookings.value || 0}
              icon={DollarSign}
              format="currency"
            />
            <MetricCard
              title="Monthly Active Users"
              value={data?.metrics.mau.value || 0}
              icon={Users}
              format="number"
            />
            <MetricCard
              title="ARPU (Annual)"
              value={data?.metrics.arpu.value || 0}
              icon={TrendingUp}
              format="currency"
            />
            <MetricCard
              title="Net Revenue Retention"
              value={data?.metrics.nrr.value || 0}
              icon={Repeat}
              format="percentage"
            />
          </div>

          {/* MRR by Plan */}
          <Card>
            <CardHeader>
              <CardTitle>MRR by Plan Type</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-zinc-500">Loading...</p>
                </div>
              ) : data && mrrByPlanConfig ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  {data.charts.mrrByPlan.map(plan => (
                    <div
                      key={plan.plan}
                      className="text-center p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                    >
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 capitalize">
                        {plan.plan}
                      </p>
                      <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                        ${plan.mrr.toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {plan.subscribers} subscribers
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-zinc-500">Loading...</p>
                  </div>
                ) : data && funnelConfig ? (
                  <FunnelChart config={funnelConfig} />
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-zinc-500">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-zinc-500">Loading...</p>
                  </div>
                ) : data && engagementConfig ? (
                  <AreaChart config={engagementConfig} />
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-zinc-500">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* NRR Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Net Revenue Retention (NRR) Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                      <Repeat className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">
                        NRR
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Revenue retained from existing customers
                      </p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {(data?.metrics.nrr.value || 0).toFixed(2)}%
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      112%
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Expansion
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      -5%
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Churn
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">-2%</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Downgrades
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">100%</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Retention
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
