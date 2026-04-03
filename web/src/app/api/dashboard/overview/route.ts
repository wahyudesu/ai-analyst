import { NextRequest, NextResponse } from "next/server";
import { queryNeon } from "@/lib/db";

// Cache for 5 minutes (300 seconds)
export const revalidate = 300;
export const dynamic = "force-dynamic";

// Time range types
type TimeRange = "7d" | "30d" | "90d" | "12w" | "all" | "custom";
type ComparisonMode = "wow" | "mom" | "yoy";

export async function GET(request: NextRequest) {
  return await POST(request);
}

export async function POST(request: NextRequest) {
  try {
    // Get custom database URL from request body (for POST) or query param (for GET)
    let databaseUrl: string | undefined;
    let timeRange: TimeRange = "30d";
    let comparisonMode: ComparisonMode = "mom";
    let customStartDate: string | undefined;
    let customEndDate: string | undefined;

    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      databaseUrl = body.databaseUrl;
      timeRange = body.timeRange || "30d";
      comparisonMode = body.comparisonMode || "mom";
      customStartDate = body.customStartDate;
      customEndDate = body.customEndDate;
    } else {
      databaseUrl = request.nextUrl.searchParams.get("databaseUrl") || undefined;
      timeRange = (request.nextUrl.searchParams.get("timeRange") as TimeRange) || "30d";
      comparisonMode = (request.nextUrl.searchParams.get("comparisonMode") as ComparisonMode) || "mom";
      customStartDate = request.nextUrl.searchParams.get("customStartDate") || undefined;
      customEndDate = request.nextUrl.searchParams.get("customEndDate") || undefined;
    }

    // Helper function to get interval based on time range
    const getInterval = (range: TimeRange): string => {
      switch (range) {
        case "7d": return "7 days";
        case "30d": return "30 days";
        case "90d": return "90 days";
        case "12w": return "84 days"; // 12 weeks
        case "all": return "100 years"; // Effectively all time
        case "custom": return "30 days"; // Fallback, actual dates used in query
        default: return "30 days";
      }
    };

    // Helper to get comparison interval based on mode
    const getComparisonIntervals = (mode: ComparisonMode): { current: string; previous: string } => {
      switch (mode) {
        case "wow":
          return { current: "7 days", previous: "14 days" };
        case "mom":
          return { current: "30 days", previous: "60 days" };
        case "yoy":
          return { current: "365 days", previous: "730 days" };
        default:
          return { current: "30 days", previous: "60 days" };
      }
    };

    // Helper to build date filter for custom range
    const getDateFilter = (range: TimeRange, interval: string): string => {
      if (range === "custom" && customStartDate && customEndDate) {
        return `created_at >= '${customStartDate}' AND created_at <= '${customEndDate}'`;
      }
      return `created_at >= NOW() - INTERVAL '${interval}'`;
    };

    const interval = getInterval(timeRange);
    const comparisonIntervals = getComparisonIntervals(comparisonMode);

    // Parallel: Execute all independent queries simultaneously using Promise.all()
    // This eliminates the waterfall pattern where each query waited for the previous one
    const [
      totalUsersResult,
      totalAgentsResult,
      totalConversationsResult,
      totalMessagesResult,
      activeSubscriptionsResult,
      messagesCurrentResult,
      messagesPreviousResult,
      conversationsCurrentResult,
      conversationsPreviousResult,
      activatedUsersResult,
      userGrowthResult,
      newUsersOverTimeResult,
      conversationsOverTimeResult,
      messagesOverTimeResult,
      agentsByModelResult,
      subscriptionsByPlanResult,
    ] = await Promise.all([
      // Basic count queries
      queryNeon(`SELECT COUNT(*) as count FROM profiles`, [], databaseUrl),
      queryNeon(`SELECT COUNT(*) as count FROM agents`, [], databaseUrl),
      queryNeon(`SELECT COUNT(*) as count FROM conversations`, [], databaseUrl),
      queryNeon(`SELECT COUNT(*) as count FROM messages`, [], databaseUrl),
      queryNeon(`SELECT COUNT(*) as count FROM billing_plan_subscriptions WHERE status = 'active'`, [], databaseUrl),
      // Time-range queries for messages
      queryNeon(`SELECT COUNT(*) as count FROM messages WHERE ${getDateFilter(timeRange, interval)}`, [], databaseUrl),
      queryNeon(
        `SELECT COUNT(*) as count FROM messages WHERE created_at >= NOW() - INTERVAL '${comparisonIntervals.previous}' AND created_at < NOW() - INTERVAL '${comparisonIntervals.current}'`,
        [],
        databaseUrl
      ),
      // Time-range queries for conversations
      queryNeon(`SELECT COUNT(*) as count FROM conversations WHERE ${getDateFilter(timeRange, interval)}`, [], databaseUrl),
      queryNeon(
        `SELECT COUNT(*) as count FROM conversations WHERE created_at >= NOW() - INTERVAL '${comparisonIntervals.previous}' AND created_at < NOW() - INTERVAL '${comparisonIntervals.current}'`,
        [],
        databaseUrl
      ),
      // User-related queries
      queryNeon(`SELECT COUNT(DISTINCT profile_id) as count FROM conversations`, [], databaseUrl),
      queryNeon(
        `WITH user_periods AS (
          SELECT
            CASE
              WHEN created_at >= NOW() - INTERVAL '${comparisonIntervals.current}' THEN 'current'
              WHEN created_at >= NOW() - INTERVAL '${comparisonIntervals.previous}' AND created_at < NOW() - INTERVAL '${comparisonIntervals.current}' THEN 'previous'
            END as period,
            COUNT(*) as count
          FROM profiles
          WHERE created_at >= NOW() - INTERVAL '${comparisonIntervals.previous}'
          GROUP BY period
        )
        SELECT
          (SELECT count FROM user_periods WHERE period = 'current') as current_period,
          (SELECT count FROM user_periods WHERE period = 'previous') as previous_period`,
        [],
        databaseUrl
      ),
      // Time series queries (last 12 weeks)
      queryNeon(
        `SELECT DATE_TRUNC('week', created_at)::date as date, COUNT(*) as new_users FROM profiles WHERE created_at >= NOW() - INTERVAL '84 days' GROUP BY DATE_TRUNC('week', created_at)::date ORDER BY date DESC LIMIT 12`,
        [],
        databaseUrl
      ),
      queryNeon(
        `SELECT DATE_TRUNC('week', created_at)::date as date, COUNT(*) as conversations FROM conversations WHERE created_at >= NOW() - INTERVAL '84 days' GROUP BY DATE_TRUNC('week', created_at)::date ORDER BY date DESC LIMIT 12`,
        [],
        databaseUrl
      ),
      queryNeon(
        `SELECT DATE_TRUNC('week', created_at)::date as date, COUNT(*) as messages FROM messages WHERE created_at >= NOW() - INTERVAL '84 days' GROUP BY DATE_TRUNC('week', created_at)::date ORDER BY date DESC LIMIT 12`,
        [],
        databaseUrl
      ),
      // Distribution queries
      queryNeon(`SELECT model, COUNT(*) as count FROM agents GROUP BY model ORDER BY count DESC`, [], databaseUrl),
      queryNeon(`SELECT plan_key, COUNT(*) as count FROM billing_plan_subscriptions WHERE status = 'active' GROUP BY plan_key ORDER BY count DESC`, [], databaseUrl),
    ]);

    // Parse results from parallel queries
    const totalUsers = parseInt(totalUsersResult[0]?.count) || 0;
    const totalAgents = parseInt(totalAgentsResult[0]?.count) || 0;
    const totalConversations = parseInt(totalConversationsResult[0]?.count) || 0;
    const totalMessages = parseInt(totalMessagesResult[0]?.count) || 0;
    const activeSubscriptions = parseInt(activeSubscriptionsResult[0]?.count) || 0;
    const messagesCurrent = parseInt(messagesCurrentResult[0]?.count) || 0;
    const messagesPrevious = parseInt(messagesPreviousResult[0]?.count) || 0;
    const conversationsCurrent = parseInt(conversationsCurrentResult[0]?.count) || 0;
    const conversationsPrevious = parseInt(conversationsPreviousResult[0]?.count) || 0;
    const activatedUsers = parseInt(activatedUsersResult[0]?.count) || 0;
    const currentPeriodUsers = parseInt(userGrowthResult[0]?.current_period) || 0;
    const previousPeriodUsers = parseInt(userGrowthResult[0]?.previous_period) || 1;

    // Calculate derived values (must happen after queries complete)
    const messagesChange = messagesPrevious > 0 ? ((messagesCurrent - messagesPrevious) / messagesPrevious) * 100 : 0;
    const conversationsChange = conversationsPrevious > 0
      ? ((conversationsCurrent - conversationsPrevious) / conversationsPrevious) * 100
      : 0;
    const userGrowthRate = previousPeriodUsers > 0 ? ((currentPeriodUsers - previousPeriodUsers) / previousPeriodUsers) * 100 : 0;

    return NextResponse.json(
      {
        metrics: {
          totalUsers: {
            value: totalUsers,
            format: "number",
            current: currentPeriodUsers,
            previous: previousPeriodUsers,
            change: userGrowthRate
          },
          totalAgents: { value: totalAgents, format: "number" },
          totalConversations: { value: totalConversations, format: "number" },
          totalMessages: { value: totalMessages, format: "number" },
          activeSubscriptions: { value: activeSubscriptions, format: "number" },
          messagesLast30Days: {
            value: messagesCurrent,
            format: "number",
            current: messagesCurrent,
            previous: messagesPrevious,
            change: messagesChange
          },
          conversationsLast30Days: {
            value: conversationsCurrent,
            format: "number",
            current: conversationsCurrent,
            previous: conversationsPrevious,
            change: conversationsChange
          },
          activatedUsers: { value: activatedUsers, format: "number" },
          userGrowthRate: {
            value: userGrowthRate,
            format: "percentage",
            current: currentPeriodUsers,
            previous: previousPeriodUsers,
            change: userGrowthRate
          },
          activationRate: {
            value: totalUsers > 0 ? (activatedUsers / totalUsers) * 100 : 0,
            format: "percentage"
          },
        },
        // Include current time range and comparison mode in response
        meta: {
          timeRange,
          comparisonMode,
          interval,
          comparisonIntervals
        },
        charts: {
          newUsersOverTime: {
            labels: newUsersOverTimeResult.map((r: any) => r.date).reverse(),
            values: newUsersOverTimeResult.map((r: any) => parseInt(r.new_users)).reverse(),
          },
          conversationsOverTime: {
            labels: conversationsOverTimeResult.map((r: any) => r.date).reverse(),
            values: conversationsOverTimeResult.map((r: any) => parseInt(r.conversations)).reverse(),
          },
          messagesOverTime: {
            labels: messagesOverTimeResult.map((r: any) => r.date).reverse(),
            values: messagesOverTimeResult.map((r: any) => parseInt(r.messages)).reverse(),
          },
          agentsByModel: agentsByModelResult.map((r: any) => ({
            model: r.model,
            count: parseInt(r.count),
          })),
          subscriptionsByPlan: subscriptionsByPlanResult.map((r: any) => ({
            plan: r.plan_key,
            count: parseInt(r.count),
          })),
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Overview API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch overview data", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
