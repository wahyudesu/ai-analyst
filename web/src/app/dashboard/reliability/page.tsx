"use client"

import { Tracker, generateUptimeData } from "@/components/Tracker"
import { BarChart } from "@/components/charts/BarChart"
import { LineChart } from "@/components/charts/LineChart"
import { MetricCard } from "@/components/dashboard/MetricCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Rocket, ShieldCheck, Timer } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

interface ReliabilityData {
  metrics: {
    uptime: { value: number; format: string }
    incidents: { value: number; format: string }
    avgResponseTime: { value: number; format: string }
    weeklyDeployments: { value: number; format: string }
  }
  charts: {
    uptimeHistory: { labels: string[]; values: number[] }
    deploymentsHistory: { labels: string[]; values: number[] }
  }
}

interface ServiceStatus {
  name: string
  url: string
  status: "Operational" | "Degraded" | "Downtime"
  uptime: number
  data90: ReturnType<typeof generateUptimeData>
  data60: ReturnType<typeof generateUptimeData>
  data30: ReturnType<typeof generateUptimeData>
}

// Hoist these functions outside component to avoid recreation on every render (rendering-hoist-jsx)
const getStatusColor = (status: ServiceStatus["status"]) => {
  switch (status) {
    case "Operational":
      return "bg-emerald-500 dark:bg-emerald-500"
    case "Degraded":
      return "bg-yellow-500 dark:bg-yellow-500"
    case "Downtime":
      return "bg-red-500 dark:bg-red-500"
  }
}

const getStatusTextColor = (status: ServiceStatus["status"]) => {
  switch (status) {
    case "Operational":
      return "text-emerald-600 dark:text-emerald-400"
    case "Degraded":
      return "text-yellow-600 dark:text-yellow-400"
    case "Downtime":
      return "text-red-600 dark:text-red-400"
  }
}

export default function ReliabilityPage() {
  const [data, setData] = useState<ReliabilityData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/dashboard/reliability")
        if (response.ok) {
          const result = await response.json()
          setData(result)
        }
      } catch (error) {
        console.error("Failed to fetch reliability data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const uptime = data?.metrics.uptime.value || 99.95
  const uptimeStatus =
    uptime >= 99.9 ? "excellent" : uptime >= 99.5 ? "good" : "fair"

  // Use useMemo to avoid recreating services array on every render (rerender-memo)
  const services: ServiceStatus[] = useMemo(
    () => [
      {
        name: "API Services",
        url: "api.example.com",
        status: "Operational",
        uptime: 99.95,
        data90: generateUptimeData(90, 99.95),
        data60: generateUptimeData(60, 99.95),
        data30: generateUptimeData(30, 99.95),
      },
      {
        name: "Database",
        url: "db.example.com",
        status: "Operational",
        uptime: 99.98,
        data90: generateUptimeData(90, 99.98),
        data60: generateUptimeData(60, 99.98),
        data30: generateUptimeData(30, 99.98),
      },
      {
        name: "Web Application",
        url: "app.example.com",
        status: "Operational",
        uptime: 99.92,
        data90: generateUptimeData(90, 99.92),
        data60: generateUptimeData(60, 99.92),
        data30: generateUptimeData(30, 99.92),
      },
    ],
    []
  )

  // Use 30 days data for card display
  const trackerDataDays = 30

  return (
    <main className="p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Status Banner */}
        <div
          className={`p-4 rounded-lg ${
            uptimeStatus === "excellent"
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
              : uptimeStatus === "good"
                ? "bg-primary/10 dark:bg-primary/20 border border-primary/30"
                : "bg-destructive/10 dark:bg-destructive/20 border border-destructive/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <ShieldCheck
              className={`w-6 h-6 ${
                uptimeStatus === "excellent"
                  ? "text-green-600 dark:text-green-400"
                  : uptimeStatus === "good"
                    ? "text-primary"
                    : "text-destructive"
              }`}
            />
            <div>
              <p
                className={`font-semibold ${
                  uptimeStatus === "excellent"
                    ? "text-green-900 dark:text-green-100"
                    : uptimeStatus === "good"
                      ? "text-primary"
                      : "text-destructive"
                }`}
              >
                All Systems Operational
              </p>
              <p
                className={`text-sm ${
                  uptimeStatus === "excellent"
                    ? "text-green-700 dark:text-green-300"
                    : uptimeStatus === "good"
                      ? "text-primary/80"
                      : "text-destructive/80"
                }`}
              >
                {uptime.toFixed(2)}% uptime over the past 90 days
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            title="Uptime"
            value={uptime}
            icon={ShieldCheck}
            format="percentage"
          />
          <MetricCard
            title="Incidents"
            value={data?.metrics.incidents.value || 0}
            icon={AlertTriangle}
            format="number"
          />
          <MetricCard
            title="Avg Response"
            value={data?.metrics.avgResponseTime.value || 145}
            icon={Timer}
            format="number"
          />
          <MetricCard
            title="Weekly Deploys"
            value={data?.metrics.weeklyDeployments.value || 12}
            icon={Rocket}
            format="number"
          />
        </div>

        {/* Service Status - Individual Cards */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Service Status (90 days)
          </h3>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-500" />
              <span>Operational</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-yellow-500 dark:bg-yellow-500" />
              <span>Degraded</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-red-500 dark:bg-red-500" />
              <span>Downtime</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {services.map(service => {
            const dataKey = `data${trackerDataDays}` as keyof ServiceStatus
            const trackerData = service[dataKey] as ReturnType<
              typeof generateUptimeData
            >
            return (
              <Card key={service.name} className="h-[150px]">
                <CardContent className="p-4 h-full">
                  <div className="flex flex-col h-full space-y-2">
                    {/* Service Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-2.5 rounded-full ${getStatusColor(service.status)}`}
                          aria-hidden={true}
                        />
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          {service.name}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-semibold ${getStatusTextColor(service.status)}`}
                      >
                        {service.uptime.toFixed(2)}%
                      </span>
                    </div>

                    {/* Uptime Tracker - 30 days */}
                    <Tracker data={trackerData} className="w-full flex-1" />

                    {/* URL + Status Label Row */}
                    <div className="flex items-center justify-between">
                      <p
                        className="text-xs text-zinc-500 truncate max-w-[120px]"
                        title={service.url}
                      >
                        {service.url}
                      </p>
                      <div
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                          service.status === "Operational"
                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                            : service.status === "Degraded"
                              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        }`}
                      >
                        {service.status}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="min-h-[260px]">
            <CardHeader>
              <CardTitle>Deployment Frequency</CardTitle>
            </CardHeader>
            <CardContent className="min-h-[190px]">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-zinc-500">Loading...</p>
                </div>
              ) : data && data.charts.deploymentsHistory.labels.length > 0 ? (
                <BarChart
                  config={{
                    chartType: "bar",
                    title: "Deployment Frequency",
                    data: {
                      series: [
                        {
                          name: "Deployments",
                          data: data.charts.deploymentsHistory.labels.map(
                            (label, i) => ({
                              x: label,
                              y: data.charts.deploymentsHistory.values[i],
                            })
                          ),
                          color: "#14B8A6",
                        },
                      ],
                    },
                    xAxis: { label: "Week", type: "category" },
                    yAxis: [{ label: "Deployments" }],
                    options: {
                      legend: false,
                      stacked: false,
                      horizontal: false,
                      showDataLabels: false,
                    },
                    colors: { palette: ["#14B8A6"] },
                    metadata: {
                      dataSourceRowCount:
                        data.charts.deploymentsHistory.labels.length,
                      displayedPointCount:
                        data.charts.deploymentsHistory.labels.length,
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

          <Card className="min-h-[260px]">
            <CardHeader>
              <CardTitle>Uptime Trend (6 Months)</CardTitle>
            </CardHeader>
            <CardContent className="min-h-[190px]">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-zinc-500">Loading...</p>
                </div>
              ) : data && data.charts.uptimeHistory.labels.length > 0 ? (
                <LineChart
                  config={{
                    chartType: "line",
                    title: "Uptime Trend (6 Months)",
                    data: {
                      series: [
                        {
                          name: "Uptime %",
                          data: data.charts.uptimeHistory.labels.map(
                            (label, i) => ({
                              x: label,
                              y: data.charts.uptimeHistory.values[i],
                            })
                          ),
                          color: "#10B981",
                        },
                      ],
                    },
                    xAxis: { label: "Month", type: "category" },
                    yAxis: [{ label: "Uptime %" }],
                    options: {
                      legend: false,
                      stacked: false,
                      horizontal: false,
                      showDataLabels: false,
                    },
                    colors: { palette: ["#10B981"] },
                    metadata: {
                      dataSourceRowCount:
                        data.charts.uptimeHistory.labels.length,
                      displayedPointCount:
                        data.charts.uptimeHistory.labels.length,
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

        {/* SLA Compliance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>API SLA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  99.9%
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Target: 99.9%
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  Compliant
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Database SLA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  99.95%
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Target: 99.9%
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  Compliant
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">145ms</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Target: &lt;200ms
                </p>
                <p className="text-xs text-primary mt-2">Within Target</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
