"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, LineChart } from "@/components/charts";
import type { ChartConfig } from "@/components/charts/types";
import {
  MetricCardGridSkeleton,
  ChartSkeleton,
} from "@/components/dashboard/Skeleton";
import { Users, Bot, MessageSquare, Send, CreditCard, TrendingUp, AlertCircle, Zap } from "lucide-react";
import { useEffect, useState } from "react";

interface OverviewData {
  metrics: {
    totalUsers: { value: number; format: string; change: number };
    totalAgents: { value: number; format: string };
    totalConversations: { value: number; format: string };
    totalMessages: { value: number; format: string };
    activeSubscriptions: { value: number; format: string };
    messagesLast30Days: { value: number; format: string };
    conversationsLast30Days: { value: number; format: string };
    activatedUsers: { value: number; format: string };
    userGrowthRate: { value: number; format: string };
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
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null);
        const response = await fetch("/api/dashboard/overview");
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        const result = await response.json();
        if (result.error) {
          throw new Error(result.error);
        }
        setData(result);
      } catch (error) {
        console.error("Failed to fetch overview data:", error);
        setError(error instanceof Error ? error.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (error) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          title="Overview"
          subtitle="AIWorkerX Platform Analytics"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Card className="border-destructive/50">
              <CardContent className="p-6">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Failed to load dashboard data
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                  <Button onClick={() => window.location.reload()}>Try Again</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Chart configurations
  const usersChartConfig: ChartConfig | null = data ? {
    chartType: "line",
    title: "New Users (12 Weeks)",
    data: {
      series: [
        {
          name: "New Users",
          data: data.charts.newUsersOverTime.labels.map((label, i) => ({
            x: label,
            y: data.charts.newUsersOverTime.values[i],
          })),
          color: "hsl(var(--primary))",
        },
      ],
    },
    xAxis: {
      label: "Week",
      type: "category",
    },
    yAxis: [
      {
        label: "Users",
      },
    ],
    options: {
      legend: false,
      stacked: false,
      horizontal: false,
      showDataLabels: false,
    },
    colors: {
      palette: ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"],
    },
    metadata: {
      dataSourceRowCount: data.charts.newUsersOverTime.labels.length,
      displayedPointCount: data.charts.newUsersOverTime.labels.length,
      generatedAt: new Date().toISOString(),
    },
  } : null;

  const conversationsChartConfig: ChartConfig | null = data ? {
    chartType: "bar",
    title: "Conversations (12 Weeks)",
    data: {
      series: [
        {
          name: "Conversations",
          data: data.charts.conversationsOverTime.labels.map((label, i) => ({
            x: label,
            y: data.charts.conversationsOverTime.values[i],
          })),
          color: "hsl(var(--chart-2))",
        },
      ],
    },
    xAxis: {
      label: "Week",
      type: "category",
    },
    yAxis: [
      {
        label: "Conversations",
      },
    ],
    options: {
      legend: false,
      stacked: false,
      horizontal: false,
      showDataLabels: false,
    },
    colors: {
      palette: ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"],
    },
    metadata: {
      dataSourceRowCount: data.charts.conversationsOverTime.labels.length,
      displayedPointCount: data.charts.conversationsOverTime.labels.length,
      generatedAt: new Date().toISOString(),
    },
  } : null;

  const messagesChartConfig: ChartConfig | null = data ? {
    chartType: "line",
    title: "Messages (12 Weeks)",
    data: {
      series: [
        {
          name: "Messages",
          data: data.charts.messagesOverTime.labels.map((label, i) => ({
            x: label,
            y: data.charts.messagesOverTime.values[i],
          })),
          color: "hsl(var(--chart-3))",
        },
      ],
    },
    xAxis: {
      label: "Week",
      type: "category",
    },
    yAxis: [
      {
        label: "Messages",
      },
    ],
    options: {
      legend: false,
      stacked: false,
      horizontal: false,
      showDataLabels: false,
    },
    colors: {
      palette: ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"],
    },
    metadata: {
      dataSourceRowCount: data.charts.messagesOverTime.labels.length,
      displayedPointCount: data.charts.messagesOverTime.labels.length,
      generatedAt: new Date().toISOString(),
    },
  } : null;

  const agentsChartConfig: ChartConfig | null = data && data.charts.agentsByModel.length > 0 ? {
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
          color: "hsl(var(--primary))",
        },
      ],
    },
    xAxis: {
      label: "Model",
      type: "category",
    },
    yAxis: [
      {
        label: "Count",
      },
    ],
    options: {
      legend: false,
      stacked: false,
      horizontal: true,
      showDataLabels: false,
    },
    colors: {
      palette: ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"],
    },
    metadata: {
      dataSourceRowCount: data.charts.agentsByModel.length,
      displayedPointCount: data.charts.agentsByModel.length,
      generatedAt: new Date().toISOString(),
    },
  } : null;

  const subscriptionsChartConfig: ChartConfig | null = data && data.charts.subscriptionsByPlan.length > 0 ? {
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
          color: "hsl(var(--chart-4))",
        },
      ],
    },
    xAxis: {
      label: "Plan",
      type: "category",
    },
    yAxis: [
      {
        label: "Count",
      },
    ],
    options: {
      legend: false,
      stacked: false,
      horizontal: true,
      showDataLabels: false,
    },
    colors: {
      palette: ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"],
    },
    metadata: {
      dataSourceRowCount: data.charts.subscriptionsByPlan.length,
      displayedPointCount: data.charts.subscriptionsByPlan.length,
      generatedAt: new Date().toISOString(),
    },
  } : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <DashboardHeader
        title="Overview"
        subtitle="AIWorkerX Platform Analytics"
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {loading ? (
            <>
              <MetricCardGridSkeleton count={6} />
              <ChartSkeleton />
            </>
          ) : (
            <>
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard
                  title="Total Users"
                  value={data?.metrics.totalUsers.value || 0}
                  change={data?.metrics.userGrowthRate.value}
                  changeLabel="growth rate"
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
                  title="Active Subscriptions"
                  value={data?.metrics.activeSubscriptions.value || 0}
                  icon={CreditCard}
                  format="number"
                />
                <MetricCard
                  title="Messages (30d)"
                  value={data?.metrics.messagesLast30Days.value || 0}
                  icon={Zap}
                  format="number"
                />
              </div>

              {/* Activity Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Conversations (30d)
                        </p>
                        <p className="text-2xl font-bold text-foreground mt-1">
                          {data?.metrics.conversationsLast30Days.value || 0}
                        </p>
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
                          User Growth Rate
                        </p>
                        <p className="text-2xl font-bold text-foreground mt-1">
                          {data?.metrics.userGrowthRate.value.toFixed(1) || 0}%
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
                        <p className="text-zinc-500">No data available</p>
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
                        <p className="text-zinc-500">No data available</p>
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
                      <p className="text-zinc-500">No data available</p>
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
                        <p className="text-zinc-500 text-sm">No agent data available</p>
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
                        <p className="text-zinc-500 text-sm">No subscription data available</p>
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
                        {data?.metrics.activationRate.value.toFixed(1) || 0}%
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
