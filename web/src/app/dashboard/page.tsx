"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RefreshButton } from "@/components/dashboard/RefreshButton";
import { TimelineFilter, TimeRange } from "@/components/dashboard/TimelineFilter";
import { ComparisonMode } from "@/components/dashboard/ComparisonToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, LineChart } from "@/components/charts";
import type { ChartConfig } from "@/components/charts/types";
import {
  MetricCardGridSkeleton,
  ChartSkeleton,
} from "@/components/dashboard/Skeleton";
import { useDashboardCache } from "@/hooks/useDashboardCache";
import { useDatabaseConfig } from "@/lib/use-database-config";
import { Users, Bot, MessageSquare, Send, CreditCard, TrendingUp, AlertCircle, Zap } from "lucide-react";
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
            <Card className="border-destructive/50">
              <CardContent className="p-6">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Failed to load dashboard data
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                  <Button onClick={handleRefresh}>Try Again</Button>
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
              <div className="grid grid-cols-2 gap-3">
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
                />
              </div>

              {/* Activity Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Conversations ({timeRange === "all" ? "All" : timeRange})
                        </p>
                        <p className="text-2xl font-bold text-foreground mt-1">
                          {data?.metrics.conversationsLast30Days.value || 0}
                        </p>
                        {data?.metrics.conversationsLast30Days.change !== undefined && (
                          <p className={`text-sm mt-1 ${data.metrics.conversationsLast30Days.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.metrics.conversationsLast30Days.change >= 0 ? '+' : ''}{data.metrics.conversationsLast30Days.change.toFixed(1)}% vs previous
                          </p>
                        )}
                      </div>
                      <MessageSquare className="w-8 h-8 text-primary/20" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          User Growth ({comparisonMode.toUpperCase()})
                        </p>
                        <p className="text-2xl font-bold text-foreground mt-1">
                          {data?.metrics.userGrowthRate.value.toFixed(2) || 0}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {data?.metrics.totalUsers.current || 0} vs {data?.metrics.totalUsers.previous || 0} users
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-green-500/20" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>New Users (12 Weeks)</CardTitle>
                  </CardHeader>
                    <CardContent>
                      {usersChartConfig ? (
                        <LineChart config={usersChartConfig} />
                      ) : (
                        <div className="h-64 flex items-center justify-center">
                          <p className="text-muted-foreground">No data available</p>
                        </div>
                      )}
                    </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Conversations (12 Weeks)</CardTitle>
                  </CardHeader>
                    <CardContent>
                      {conversationsChartConfig ? (
                        <BarChart config={conversationsChartConfig} />
                      ) : (
                        <div className="h-64 flex items-center justify-center">
                          <p className="text-muted-foreground">No data available</p>
                        </div>
                      )}
                    </CardContent>
                </Card>
              </div>

              {/* Messages Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Messages (12 Weeks)</CardTitle>
                </CardHeader>
                  <CardContent>
                    {messagesChartConfig ? (
                      <LineChart config={messagesChartConfig} />
                    ) : (
                      <div className="h-64 flex items-center justify-center">
                        <p className="text-muted-foreground">No data available</p>
                      </div>
                    )}
                  </CardContent>
              </Card>

              {/* Distribution Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Agents by Model</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {agentsChartConfig ? (
                      <BarChart config={agentsChartConfig} />
                    ) : (
                        <div className="h-48 flex items-center justify-center">
                          <p className="text-muted-foreground text-sm">No agent data available</p>
                        </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Active Subscriptions by Plan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {subscriptionsChartConfig ? (
                      <BarChart config={subscriptionsChartConfig} />
                    ) : (
                        <div className="h-48 flex items-center justify-center">
                          <p className="text-muted-foreground text-sm">No subscription data available</p>
                        </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Activation Rate */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Activation Rate
                      </p>
                      <p className="text-3xl font-bold text-primary mt-1">
                        {data?.metrics.activationRate.value.toFixed(2) || 0}%
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Users who created at least one conversation
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {data?.metrics.activatedUsers.value || 0} of {data?.metrics.totalUsers.value || 0} users
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${data?.metrics.activationRate.value || 0}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
