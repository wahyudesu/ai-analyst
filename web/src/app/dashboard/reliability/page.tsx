"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, LineChart } from "@/components/charts";
import type { ChartConfig } from "@/components/charts/types";
import { Shield, AlertTriangle, Clock, Rocket } from "lucide-react";
import { useEffect, useState } from "react";

interface ReliabilityData {
  metrics: {
    uptime: { value: number; format: string };
    incidents: { value: number; format: string };
    avgResponseTime: { value: number; format: string };
    weeklyDeployments: { value: number; format: string };
  };
  charts: {
    uptimeHistory: { labels: string[]; values: number[] };
    deploymentsHistory: { labels: string[]; values: number[] };
    responseTimeHistory: { labels: string[]; values: number[] };
  };
}

export default function ReliabilityPage() {
  const [data, setData] = useState<ReliabilityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/dashboard/reliability");
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch reliability data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const uptimeConfig: ChartConfig | null = data ? {
    chartType: "line",
    title: "Uptime Trend (6 Months)",
    data: {
      series: [
        {
          name: "Uptime %",
          data: data.charts.uptimeHistory.labels.map((label, i) => ({
            x: label,
            y: data.charts.uptimeHistory.values[i],
          })),
          color: "#10B981",
        },
      ],
    },
    xAxis: { label: "Month", type: "category" },
    yAxis: [{ label: "Uptime %" }],
    options: { legend: false, stacked: false, horizontal: false, showDataLabels: false },
    colors: { palette: ["#10B981"] },
    metadata: {
      dataSourceRowCount: data.charts.uptimeHistory.labels.length,
      displayedPointCount: data.charts.uptimeHistory.labels.length,
      generatedAt: new Date().toISOString(),
    },
  } : null;

  const deploymentsConfig: ChartConfig | null = data ? {
    chartType: "bar",
    title: "Deployment Frequency",
    data: {
      series: [
        {
          name: "Deployments",
          data: data.charts.deploymentsHistory.labels.map((label, i) => ({
            x: label,
            y: data.charts.deploymentsHistory.values[i],
          })),
          color: "#14B8A6",
        },
      ],
    },
    xAxis: { label: "Week", type: "category" },
    yAxis: [{ label: "Deployments" }],
    options: { legend: false, stacked: false, horizontal: false, showDataLabels: false },
    colors: { palette: ["#14B8A6"] },
    metadata: {
      dataSourceRowCount: data.charts.deploymentsHistory.labels.length,
      displayedPointCount: data.charts.deploymentsHistory.labels.length,
      generatedAt: new Date().toISOString(),
    },
  } : null;

  const responseTimeConfig: ChartConfig | null = data ? {
    chartType: "line",
    title: "Average Response Time",
    data: {
      series: [
        {
          name: "Response Time (ms)",
          data: data.charts.responseTimeHistory.labels.map((label, i) => ({
            x: label,
            y: data.charts.responseTimeHistory.values[i],
          })),
          color: "#F97316",
        },
      ],
    },
    xAxis: { label: "Day", type: "category" },
    yAxis: [{ label: "Time (ms)" }],
    options: { legend: false, stacked: false, horizontal: false, showDataLabels: false },
    colors: { palette: ["#F97316"] },
    metadata: {
      dataSourceRowCount: data.charts.responseTimeHistory.labels.length,
      displayedPointCount: data.charts.responseTimeHistory.labels.length,
      generatedAt: new Date().toISOString(),
    },
  } : null;

  const uptime = data?.metrics.uptime.value || 99.95;
  const uptimeStatus = uptime >= 99.9 ? "excellent" : uptime >= 99.5 ? "good" : "fair";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <DashboardHeader
        title="Reliability & Tech Health"
        subtitle="System performance and deployment metrics"
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Status Banner */}
          <div className={`p-4 rounded-lg ${
            uptimeStatus === "excellent"
              ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
              : uptimeStatus === "good"
              ? "bg-primary/10 dark:bg-primary/20 border border-primary/30"
              : "bg-destructive/10 dark:bg-destructive/20 border border-destructive/30"
          }`}>
            <div className="flex items-center gap-3">
              <Shield className={`w-6 h-6 ${
                uptimeStatus === "excellent"
                  ? "text-green-600 dark:text-green-400"
                  : uptimeStatus === "good"
                  ? "text-primary"
                  : "text-destructive"
              }`} />
              <div>
                <p className={`font-semibold ${
                  uptimeStatus === "excellent"
                    ? "text-green-900 dark:text-green-100"
                    : uptimeStatus === "good"
                    ? "text-primary"
                    : "text-destructive"
                }`}>
                  All Systems Operational
                </p>
                <p className={`text-sm ${
                  uptimeStatus === "excellent"
                    ? "text-green-700 dark:text-green-300"
                    : uptimeStatus === "good"
                    ? "text-primary/80"
                    : "text-destructive/80"
                }`}>
                  {uptime.toFixed(2)}% uptime over the past 90 days
                </p>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Uptime (90d)"
              value={uptime}
              icon={Shield}
              format="percentage"
            />
            <MetricCard
              title="Incidents (90d)"
              value={data?.metrics.incidents.value || 0}
              icon={AlertTriangle}
              format="number"
            />
            <MetricCard
              title="Avg Response Time"
              value={data?.metrics.avgResponseTime.value || 0}
              icon={Clock}
              format="number"
            />
            <MetricCard
              title="Weekly Deployments"
              value={data?.metrics.weeklyDeployments.value || 0}
              icon={Rocket}
              format="number"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Uptime Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-zinc-500">Loading...</p>
                  </div>
                ) : uptimeConfig ? (
                  <LineChart config={uptimeConfig} />
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-zinc-500">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deployment Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-zinc-500">Loading...</p>
                  </div>
                ) : deploymentsConfig ? (
                  <BarChart config={deploymentsConfig} />
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-zinc-500">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Response Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Response Time (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-zinc-500">Loading...</p>
                </div>
              ) : responseTimeConfig ? (
                <LineChart config={responseTimeConfig} />
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-zinc-500">No data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SLA Compliance */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>API SLA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">99.9%</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Target: 99.9%</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">Compliant</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database SLA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">99.95%</p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Target: 99.9%</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">Compliant</p>
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
                  <p className="text-sm text-muted-foreground mt-1">Target: &lt;200ms</p>
                  <p className="text-xs text-primary mt-2">Within Target</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
