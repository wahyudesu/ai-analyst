"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCard, type SparklineData } from "@/components/dashboard/MetricCard";
import { RefreshButton } from "@/components/dashboard/RefreshButton";
import { TimelineFilter, TimeRange } from "@/components/dashboard/TimelineFilter";
import { ComparisonMode } from "@/components/dashboard/ComparisonToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { AreaChart } from "@/components/charts/AreaChart";
import type { ChartConfig } from "@/components/charts/types";
import {
  MetricCardGridSkeleton,
  ChartSkeleton,
} from "@/components/dashboard/Skeleton";
import { useDashboardCache } from "@/hooks/useDashboardCache";
import { useDatabaseConfig } from "@/lib/use-database-config";
import { Users, Bot, MessageSquare, Send, CreditCard, TrendingUp, AlertCircle, Zap, RefreshCw } from "lucide-react";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";

interface OverviewData {
  metrics: {
    totalUsers: { value: number; format: string; change: number; current?: number; previous?: number };
    totalAgents: { value: number; format: string };
    totalConversations: { value: number; format: string };
    totalMessages: { value: number; format: string };
    activeSubscriptions: { value: number; format: string };
    messagesLast30Days: { value: number; format: string; current?: number; previous?: number; change?: number };
    conversationsLast30Days: { value: number; format: string; current?: number; previous?: number; change?: number };
    activatedUsers: { value: number; format: string };
    userGrowthRate: { value: number; format: string; current?: number; previous?: number; change?: number };
    activationRate: { value: number; format: string };
  };
  charts: {
    newUsersOverTime: {
      labels: string[];
      values: number[];
    };
    conversationsOverTime: {
      labels: string[];
      values: number[];
    };
    messagesOverTime: {
      labels: string[];
      values: number[];
    };
    agentsByModel: Array<{ model: string; count: number }>;
    subscriptionsByPlan: Array<{ plan: string; count: number }>;
  };
  meta?: {
    timeRange: TimeRange;
    comparisonMode: ComparisonMode;
  };
}

export default function OverviewPage() {
  const {
    getCachedData,
    setCachedData,
    isCacheValid,
    clearCache,
    getLastRefreshTime,
  } = useDashboardCache<OverviewData>({ ttl: 24 * 60 * 60 * 1000 }); // 1 day TTL

  // Check cache IMMEDIATELY (before useEffect) to avoid loading flash
  const cachedData = getCachedData();
  const cacheValid = isCacheValid();

  // New state for timeline and comparison
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("mom");

  const [data, setData] = useState<OverviewData | null>(cachedData && cacheValid ? cachedData : null);
  const [loading, setLoading] = useState(!cachedData || !cacheValid);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { databaseUrl } = useDatabaseConfig();

  // Use ref to avoid recreating fetchFromAPI when databaseUrl changes
  const databaseUrlRef = useRef(databaseUrl);
  databaseUrlRef.current = databaseUrl;

  const fetchFromAPI = useCallback(async (bypassCache = false): Promise<OverviewData | null> => {
    try {
      setError(null);
      const response = await fetch("/api/dashboard/overview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          databaseUrl: databaseUrlRef.current || undefined,
          timeRange,
          comparisonMode,
        }),
        cache: bypassCache ? "no-store" : "default",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    } catch (error) {
      console.error("Failed to fetch overview data:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(errorMessage);
      return null;
    }
  }, [timeRange, comparisonMode]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const freshData = await fetchFromAPI(true);
      if (freshData) {
        setData(freshData);
        setCachedData(freshData);
      }
      // If error occurs, we keep the existing data (from cache)
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchFromAPI, setCachedData, databaseUrl]);

  useEffect(() => {
    // Skip if we're refreshing
    if (isRefreshing) return;

    async function loadData() {
      setLoading(true);
      const freshData = await fetchFromAPI();
      if (freshData) {
        setData(freshData);
        setCachedData(freshData);
      }
      setLoading(false);
    }
    loadData();
  }, [timeRange, comparisonMode]); // Refetch when timeRange or comparisonMode changes

      if (error) {
        return (
          <div className="flex flex-col">
            <DashboardHeader
              title="Overview"
              subtitle="AIWorkerX Platform Analytics"
            />
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
      </div>
    );
  }

  // Helper for chart title based on time range
  const getTimeRangeLabel = (range: TimeRange): string => {
    if (range === "all") return "All Time";
    const labels: Record<TimeRange, string> = {
      "7d": "7 Days",
      "30d": "30 Days",
      "90d": "90 Days",
      "12w": "12 Weeks",
      "custom": "Custom Range",
      "all": "All Time",
    };
    return labels[range] || "30 Days";
  };

  // Chart configurations - memoized to prevent re-renders
  const usersChartConfig: ChartConfig | null = useMemo(() => {
    if (!data || data.charts.newUsersOverTime.labels.length === 0) return null;
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
    };
  }, [data?.charts.newUsersOverTime.labels, data?.charts.newUsersOverTime.values]);

  const conversationsChartConfig: ChartConfig | null = useMemo(() => {
    if (!data || data.charts.conversationsOverTime.labels.length === 0) return null;
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
    };
  }, [data?.charts.conversationsOverTime.labels, data?.charts.conversationsOverTime.values]);

  const messagesChartConfig: ChartConfig | null = useMemo(() => {
    if (!data || data.charts.messagesOverTime.labels.length === 0) return null;
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
    };
  }, [data?.charts.messagesOverTime.labels, data?.charts.messagesOverTime.values]);

  const agentsChartConfig: ChartConfig | null = useMemo(() => {
    if (!data || data.charts.agentsByModel.length === 0) return null;
    return {
      chartType: "bar",
      title: "Agents by Model",
      data: {
        series: [
          {
            name: "Agents",
            data: data.charts.agentsByModel.map((item) => ({
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
    };
  }, [data?.charts.agentsByModel]);

  const subscriptionsChartConfig: ChartConfig | null = useMemo(() => {
    if (!data || data.charts.subscriptionsByPlan.length === 0) return null;
    return {
      chartType: "bar",
      title: "Active Subscriptions by Plan",
      data: {
        series: [
          {
            name: "Subscriptions",
            data: data.charts.subscriptionsByPlan.map((item) => ({
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
        palette: ["var(--primary)", "var(--secondary)", "var(--accent)", "var(--chart-4)"],
      },
      metadata: {
        dataSourceRowCount: data.charts.subscriptionsByPlan.length,
        displayedPointCount: data.charts.subscriptionsByPlan.length,
        generatedAt: new Date().toISOString(),
      },
    };
  }, [data?.charts.subscriptionsByPlan]);

      return (
        <div className="flex flex-col">
          <DashboardHeader
            title="Overview"
            subtitle="AIWorkerX Platform Analytics"
            actions={
              <div className="flex items-center gap-3">
                <TimelineFilter
                  value={timeRange}
                  onChange={setTimeRange}
                />
                {!loading && (
                  <RefreshButton
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                    lastRefresh={getLastRefreshTime()}
                  />
                )}
              </div>
            }
        />

        <main className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {loading ? (
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
                  comparisonMode={comparisonMode}
                  onComparisonChange={setComparisonMode}
                  showComparisonToggle={true}
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
                  title="Active Subscriptions"
                  value={data?.metrics.activeSubscriptions.value || 0}
                  icon={CreditCard}
                  format="number"
                />
              </div>

              {/* Metric Cards Grid - Bottom Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MetricCard
                  title={`Messages (${timeRange === "all" ? "All" : timeRange})`}
                  value={data?.metrics.messagesLast30Days.value || 0}
                  change={data?.metrics.messagesLast30Days.change}
                  previousValue={data?.metrics.messagesLast30Days.previous}
                  icon={Zap}
                  format="number"
                  comparisonMode={comparisonMode}
                  onComparisonChange={setComparisonMode}
                  showComparisonToggle={true}
                  showPreviousValue={true}
                  sparkline={data?.charts.messagesOverTime.values ? {
                    data: data.charts.messagesOverTime.values,
                    color: "auto",
                  } : undefined}
                />
                <MetricCard
                  title={`Conversations (${timeRange === "all" ? "All" : timeRange})`}
                  value={data?.metrics.conversationsLast30Days.value || 0}
                  change={data?.metrics.conversationsLast30Days.change}
                  previousValue={data?.metrics.conversationsLast30Days.previous}
                  icon={MessageSquare}
                  format="number"
                  comparisonMode={comparisonMode}
                  onComparisonChange={setComparisonMode}
                  showComparisonToggle={true}
                  showPreviousValue={true}
                  sparkline={data?.charts.conversationsOverTime.values ? {
                    data: data.charts.conversationsOverTime.values,
                    color: "auto",
                  } : undefined}
                />
                <MetricCard
                  title={`User Growth (${comparisonMode.toUpperCase()})`}
                  value={Math.round((data?.metrics.userGrowthRate.value || 0) * 10) / 10}
                  change={data?.metrics.userGrowthRate.change}
                  previousValue={data?.metrics.totalUsers.previous}
                  icon={TrendingUp}
                  format="percentage"
                  comparisonMode={comparisonMode}
                  onComparisonChange={setComparisonMode}
                  showComparisonToggle={true}
                  showPreviousValue={true}
                  sparkline={data?.charts.newUsersOverTime.values ? {
                    data: data.charts.newUsersOverTime.values,
                    color: "auto",
                  } : undefined}
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">New Users (12 Weeks)</CardTitle>
                  </CardHeader>
                    <CardContent className="min-h-[200px]">
                      {usersChartConfig ? (
                        <LineChart config={usersChartConfig} />
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-muted-foreground text-sm">No data available</p>
                        </div>
                      )}
                    </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Conversations (12 Weeks)</CardTitle>
                  </CardHeader>
                    <CardContent className="min-h-[200px]">
                      {conversationsChartConfig ? (
                        <BarChart config={conversationsChartConfig} />
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-muted-foreground text-sm">No data available</p>
                        </div>
                      )}
                    </CardContent>
                </Card>
              </div>

              {/* Messages Chart */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Messages (12 Weeks)</CardTitle>
                </CardHeader>
                  <CardContent className="h-40">
                    {messagesChartConfig ? (
                      <AreaChart config={messagesChartConfig} />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-muted-foreground text-sm">No data available</p>
                      </div>
                    )}
                  </CardContent>
              </Card>

              {/* Distribution Charts & Activation Rate */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <MetricCard
                  title="Agents by Model"
                  value={data?.charts.agentsByModel.reduce((sum, a) => sum + a.count, 0) || 0}
                  icon={Bot}
                  format="number"
                />
                <MetricCard
                  title="Active Subscriptions"
                  value={data?.metrics.activeSubscriptions.value || 0}
                  icon={CreditCard}
                  format="number"
                />
                <Card className="border-border/50">
                  <CardContent className="">
                    <div className="space-y-1.5">
                      <p className="text-sm text-muted-foreground">Activation Rate</p>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-2xl font-semibold text-foreground">
                          {Math.round((data?.metrics.activationRate.value || 0) * 10) / 10}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {data?.metrics.activatedUsers.value || 0} of {data?.metrics.totalUsers.value || 0}
                        </p>
                      </div>
                      <Progress value={data?.metrics.activationRate.value || 0} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
