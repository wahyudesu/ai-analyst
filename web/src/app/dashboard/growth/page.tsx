"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RefreshButton } from "@/components/dashboard/RefreshButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, BarChart } from "@/components/charts";
import type { ChartConfig } from "@/components/charts/types";
import { useDatabaseConfig } from "@/lib/use-database-config";
import { DollarSign, TrendingUp, Percent, Users } from "lucide-react";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";

interface GrowthData {
  metrics: {
    cac: { value: number; format: string };
    ltv: { value: number; format: string };
    ltvCacRatio: { value: string; format: string };
    payingRate: { value: number; format: string };
    repayingRate: { value: number; format: string };
  };
  charts: {
    channels: { name: string; value: number }[];
    weeklyTrend: { labels: string[]; values: number[] };
  };
}

export default function GrowthPage() {
  const [data, setData] = useState<GrowthData | null>(null);
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
      const response = await fetch("/api/dashboard/growth", {
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
      console.error("Failed to fetch growth data:", error);
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

  const channelChartConfig: ChartConfig | null = useMemo(() => {
    if (!data || data.charts.channels.length === 0) return null;
    return {
      chartType: "pie",
      title: "Signups by Channel",
      data: {
        slices: data.charts.channels.map((c, i) => ({
          name: c.name,
          value: c.value,
          percentage: (c.value / data.charts.channels.reduce((sum, ch) => sum + ch.value, 0)) * 100,
          color: ["#14B8A6", "#10B981", "#F97316", "#EF4444"][i % 4],
        })),
      },
      options: {
        legend: true,
        stacked: false,
        horizontal: false,
        showDataLabels: true,
      },
      colors: {
        palette: ["#14B8A6", "#10B981", "#F97316", "#EF4444"],
      },
      metadata: {
        dataSourceRowCount: data.charts.channels.length,
        displayedPointCount: data.charts.channels.length,
        generatedAt: new Date().toISOString(),
      },
    };
  }, [data?.charts.channels]);

  const weeklyTrendChartConfig: ChartConfig | null = useMemo(() => {
    if (!data || data.charts.weeklyTrend.labels.length === 0) return null;
    return {
      chartType: "bar",
      title: "Weekly Signups Trend",
      data: {
        series: [
          {
            name: "Signups",
            data: data.charts.weeklyTrend.labels.map((label, i) => ({
              x: label,
              y: data.charts.weeklyTrend.values[i],
            })),
            color: "#14B8A6",
          },
        ],
      },
      xAxis: { label: "Week", type: "category" },
      yAxis: [{ label: "Signups" }],
      options: {
        legend: false,
        stacked: false,
        horizontal: false,
        showDataLabels: false,
      },
      colors: { palette: ["#14B8A6"] },
      metadata: {
        dataSourceRowCount: data.charts.weeklyTrend.labels.length,
        displayedPointCount: data.charts.weeklyTrend.labels.length,
        generatedAt: new Date().toISOString(),
      },
    };
  }, [data?.charts.weeklyTrend.labels, data?.charts.weeklyTrend.values]);

      return (
        <div className="flex flex-col">
          <DashboardHeader
            title="Growth & Acquisition"
            subtitle="Customer acquisition and growth metrics"
            actions={
              <RefreshButton
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                lastRefresh={lastRefresh}
              />
            }
          />

        <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Customer Acquisition Cost"
              value={data?.metrics.cac.value || 0}
              icon={DollarSign}
              format="currency"
            />
            <MetricCard
              title="Lifetime Value"
              value={data?.metrics.ltv.value || 0}
              icon={TrendingUp}
              format="currency"
            />
            <MetricCard
              title="LTV:CAC Ratio"
              value={data?.metrics.ltvCacRatio.value || "0"}
              icon={Percent}
            />
            <MetricCard
              title="Paying Rate"
              value={data?.metrics.payingRate.value || 0}
              icon={Users}
              format="percentage"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Signups by Channel</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-zinc-500">Loading...</p>
                  </div>
                ) : channelChartConfig ? (
                  <PieChart config={channelChartConfig} />
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-zinc-500">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Signups Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-zinc-500">Loading...</p>
                  </div>
                ) : weeklyTrendChartConfig ? (
                  <BarChart config={weeklyTrendChartConfig} />
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-zinc-500">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* LTV:CAC Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>LTV:CAC Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                  <div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Current LTV:CAC Ratio</p>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                      {data?.metrics.ltvCacRatio.value || "0"}x
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">Benchmark: 3x+</p>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      {parseFloat(data?.metrics.ltvCacRatio.value || "0") >= 3 ? "Healthy" : "Needs Improvement"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-400">CAC Payback Period</p>
                    <p className="text-xl font-bold text-green-900 dark:text-green-100">
                      {Math.round((data?.metrics.cac.value || 45) / (data?.metrics.ltv.value || 792) * 12)} months
                    </p>
                  </div>
                  <div className="p-4 bg-primary/10 dark:bg-primary/20 rounded-lg">
                    <p className="text-sm text-primary">Repaying Rate</p>
                    <p className="text-xl font-bold text-primary">
                      {data?.metrics.repayingRate.value.toFixed(2) || 0}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Growth Levers */}
          <Card>
            <CardHeader>
              <CardTitle>Growth Levers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">Referral Program</p>
                  <p className="text-2xl font-bold text-primary mb-1">
                    {data?.charts.channels.find(c => c.name === "Referral")?.value || 35}%
                  </p>
                  <p className="text-xs text-zinc-500">of signups from referrals</p>
                </div>
                <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">Viral Coefficient</p>
                  <p className="text-2xl font-bold text-primary mb-1">0.4</p>
                  <p className="text-xs text-zinc-500">avg invites per user</p>
                </div>
                <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 mb-2">Conversion Rate</p>
                  <p className="text-2xl font-bold text-primary mb-1">
                    {data?.metrics.payingRate.value.toFixed(2) || 0}%
                  </p>
                  <p className="text-xs text-zinc-500">signup to paying</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
