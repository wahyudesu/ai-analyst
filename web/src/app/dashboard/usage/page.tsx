"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RefreshButton } from "@/components/dashboard/RefreshButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { AreaChart } from "@/components/charts/AreaChart";
import type { ChartConfig } from "@/components/charts/types";
import { useDatabaseConfig } from "@/lib/use-database-config";
import { Activity, Users, Zap, Target } from "lucide-react";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { databaseUrl } = useDatabaseConfig();

  // Use ref to avoid recreating fetchData when databaseUrl changes
  const databaseUrlRef = useRef(databaseUrl);
  databaseUrlRef.current = databaseUrl;

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch("/api/dashboard/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseUrl: databaseUrlRef.current || undefined }),
      });
      if (response.ok) {
        const result = await response.json();
        setData(result);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch usage data:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const dailyTrendConfig: ChartConfig | null = useMemo(() => {
    if (!data || data.charts.dailyTrend.labels.length === 0) return null;
    return {
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
    };
  }, [data?.charts.dailyTrend.labels, data?.charts.dailyTrend.dau]);

  const sourceUsageConfig: ChartConfig | null = useMemo(() => {
    if (!data || data.charts.sourceUsage.length === 0) return null;
    return {
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
    };
  }, [data?.charts.sourceUsage]);

      return (
        <div className="flex flex-col">
          <DashboardHeader
            title="Product Usage"
            subtitle="User engagement and feature adoption metrics"
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

          {/* DAU/MAU Gauge & Agent Adoption - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* DAU/MAU Gauge */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">User Stickiness (DAU/MAU)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {/* Compact Gauge */}
                  <div className="relative w-32 h-32 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="10"
                        fill="none"
                        className="text-zinc-200 dark:text-zinc-800"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="10"
                        fill="none"
                        strokeDasharray={`${(data?.metrics.dauMauRatio.value || 0) * 3.52} 352`}
                        className="text-primary"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                        {data?.metrics.dauMauRatio.value.toFixed(2) || 0}%
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {(data?.metrics.dauMauRatio.value || 0) > 25 ? "Excellent" : (data?.metrics.dauMauRatio.value || 0) > 15 ? "Good" : "Fair"}
                      </p>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <p className="text-sm"><span className="font-medium text-green-600 dark:text-green-400">25%+</span> <span className="text-zinc-500">Excellent</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <p className="text-sm"><span className="font-medium text-primary">15-25%</span> <span className="text-zinc-500">Good</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary/40"></div>
                      <p className="text-sm"><span className="font-medium text-primary/60">&lt;15%</span> <span className="text-zinc-500">Fair</span></p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agent Adoption */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Agent Adoption</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">Total Agents Created</p>
                    <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                      {data?.metrics.totalAgents.value || 0}
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">Unique Creators</p>
                    <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                      {data?.metrics.uniqueCreators.value || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  <AreaChart config={dailyTrendConfig} />
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Source Usage Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th className="text-left py-2 px-3 text-xs font-medium text-zinc-600 dark:text-zinc-400">Source</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-zinc-600 dark:text-zinc-400">Conversations</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-zinc-600 dark:text-zinc-400">Users</th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-zinc-600 dark:text-zinc-400">Messages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.charts.sourceUsage.map((source, i) => (
                      <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800/50">
                        <td className="py-2 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 dark:bg-primary/20 text-primary capitalize">
                            {source.source}
                          </span>
                        </td>
                        <td className="text-right py-2 px-3 text-sm text-zinc-900 dark:text-zinc-50">
                          {source.conversations.toLocaleString()}
                        </td>
                        <td className="text-right py-2 px-3 text-sm text-zinc-900 dark:text-zinc-50">
                          {source.users.toLocaleString()}
                        </td>
                        <td className="text-right py-2 px-3 text-sm text-zinc-900 dark:text-zinc-50">
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
      </main>
    </div>
  );
}
