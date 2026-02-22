"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, BarChart } from "@/components/charts";
import type { ChartConfig } from "@/components/charts/types";
import { Activity, Users, Zap, Target } from "lucide-react";
import { useEffect, useState } from "react";

interface UsageData {
  metrics: {
    dau: { value: number; format: string };
    mau: { value: number; format: string };
    dauMauRatio: { value: number; format: string };
    totalAgents: { value: number; format: string };
    uniqueCreators: { value: number; format: string };
  };
  charts: {
    dailyTrend: {
      labels: string[];
      dau: number[];
      conversations: number[];
      messages: number[];
    };
    sourceUsage: {
      source: string;
      conversations: number;
      users: number;
      messages: number;
    }[];
  };
}

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/dashboard/usage");
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch usage data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const dailyTrendConfig: ChartConfig | null = data ? {
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
    options: { legend: false, stacked: false, horizontal: false, showDataLabels: false },
    colors: { palette: ["#14B8A6"] },
    metadata: {
      dataSourceRowCount: data.charts.dailyTrend.labels.length,
      displayedPointCount: data.charts.dailyTrend.labels.length,
      generatedAt: new Date().toISOString(),
    },
  } : null;

  const sourceUsageConfig: ChartConfig | null = data ? {
    chartType: "bar",
    title: "Usage by Source",
    data: {
      series: [
        {
          name: "Conversations",
          data: data.charts.sourceUsage.map((s) => ({
            x: s.source,
            y: s.conversations,
          })),
          color: "#14B8A6",
        },
      ],
    },
    xAxis: { label: "Source", type: "category" },
    yAxis: [{ label: "Conversations" }],
    options: { legend: false, stacked: false, horizontal: true, showDataLabels: false },
    colors: { palette: ["#14B8A6", "#10B981", "#F97316", "#EF4444", "#8B5CF6"] },
    metadata: {
      dataSourceRowCount: data.charts.sourceUsage.length,
      displayedPointCount: data.charts.sourceUsage.length,
      generatedAt: new Date().toISOString(),
    },
  } : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <DashboardHeader
        title="Product Usage"
        subtitle="User engagement and feature adoption metrics"
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Daily Active Users"
              value={data?.metrics.dau.value || 0}
              icon={Activity}
              format="number"
            />
            <MetricCard
              title="Monthly Active Users"
              value={data?.metrics.mau.value || 0}
              icon={Users}
              format="number"
            />
            <MetricCard
              title="DAU/MAU Ratio"
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

          {/* DAU/MAU Gauge */}
          <Card>
            <CardHeader>
              <CardTitle>User Stickiness (DAU/MAU)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-zinc-200 dark:text-zinc-800"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${(data?.metrics.dauMauRatio.value || 0) * 5.53} 553`}
                      className="text-primary"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                      {data?.metrics.dauMauRatio.value.toFixed(1) || 0}%
                    </p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {(data?.metrics.dauMauRatio.value || 0) > 25 ? "Excellent" : (data?.metrics.dauMauRatio.value || 0) > 15 ? "Good" : "Fair"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">25%+</p>
                  <p className="text-xs text-zinc-500">Excellent</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-primary">15-25%</p>
                  <p className="text-xs text-zinc-500">Good</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-primary/60">&lt;15%</p>
                  <p className="text-xs text-zinc-500">Fair</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Active Users Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-zinc-500">Loading...</p>
                  </div>
                ) : dailyTrendConfig ? (
                  <LineChart config={dailyTrendConfig} />
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-zinc-500">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage by Source</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-zinc-500">Loading...</p>
                  </div>
                ) : sourceUsageConfig ? (
                  <BarChart config={sourceUsageConfig} />
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-zinc-500">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Source Usage Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Source Usage Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="text-left py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">Source</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">Conversations</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">Users</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">Messages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.charts.sourceUsage.map((source, i) => (
                      <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 dark:bg-primary/20 text-primary capitalize">
                            {source.source}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4 text-sm text-zinc-900 dark:text-zinc-50">
                          {source.conversations.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 text-sm text-zinc-900 dark:text-zinc-50">
                          {source.users.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 text-sm text-zinc-900 dark:text-zinc-50">
                          {source.messages.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Agent Adoption */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Adoption</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Agents Created</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {data?.metrics.totalAgents.value || 0}
                  </p>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Unique Creators</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                    {data?.metrics.uniqueCreators.value || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
