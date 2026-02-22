import { NextResponse } from "next/server";
import { queryNeon } from "@/lib/db";

// Cache for 5 minutes (300 seconds)
export const revalidate = 300;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get total users
    const totalUsersResult = await queryNeon(`
      SELECT COUNT(*) as count FROM profiles
    `);
    const totalUsers = parseInt(totalUsersResult[0]?.count) || 0;

    // Get total agents
    const totalAgentsResult = await queryNeon(`
      SELECT COUNT(*) as count FROM agents
    `);
    const totalAgents = parseInt(totalAgentsResult[0]?.count) || 0;

    // Get total conversations
    const totalConversationsResult = await queryNeon(`
      SELECT COUNT(*) as count FROM conversations
    `);
    const totalConversations = parseInt(totalConversationsResult[0]?.count) || 0;

    // Get total messages
    const totalMessagesResult = await queryNeon(`
      SELECT COUNT(*) as count FROM messages
    `);
    const totalMessages = parseInt(totalMessagesResult[0]?.count) || 0;

    // Get active subscriptions
    const activeSubscriptionsResult = await queryNeon(`
      SELECT COUNT(*) as count FROM billing_plan_subscriptions
      WHERE status = 'active'
    `);
    const activeSubscriptions = parseInt(activeSubscriptionsResult[0]?.count) || 0;

    // Get messages in last 30 days
    const messagesLast30DaysResult = await queryNeon(`
      SELECT COUNT(*) as count FROM messages
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    const messagesLast30Days = parseInt(messagesLast30DaysResult[0]?.count) || 0;

    // Get conversations in last 30 days
    const conversationsLast30DaysResult = await queryNeon(`
      SELECT COUNT(*) as count FROM conversations
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    const conversationsLast30Days = parseInt(conversationsLast30DaysResult[0]?.count) || 0;

    // Get users with conversations (activated users)
    const activatedUsersResult = await queryNeon(`
      SELECT COUNT(DISTINCT profile_id) as count FROM conversations
    `);
    const activatedUsers = parseInt(activatedUsersResult[0]?.count) || 0;

    // Get user growth (last 30 days vs previous 30 days)
    const userGrowthResult = await queryNeon(`
      WITH user_periods AS (
        SELECT
          CASE
            WHEN created_at >= NOW() - INTERVAL '30 days' THEN 'current'
            WHEN created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days' THEN 'previous'
          END as period,
          COUNT(*) as count
        FROM profiles
        WHERE created_at >= NOW() - INTERVAL '60 days'
        GROUP BY period
      )
      SELECT
        (SELECT count FROM user_periods WHERE period = 'current') as current_period,
        (SELECT count FROM user_periods WHERE period = 'previous') as previous_period
    `);
    const currentPeriodUsers = parseInt(userGrowthResult[0]?.current_period) || 0;
    const previousPeriodUsers = parseInt(userGrowthResult[0]?.previous_period) || 1;
    const userGrowthRate = previousPeriodUsers > 0
      ? ((currentPeriodUsers - previousPeriodUsers) / previousPeriodUsers) * 100
      : 0;

    // Get new users over time (last 12 weeks)
    const newUsersOverTimeResult = await queryNeon(`
      SELECT
        DATE_TRUNC('week', created_at)::date as date,
        COUNT(*) as new_users
      FROM profiles
      WHERE created_at >= NOW() - INTERVAL '84 days'
      GROUP BY DATE_TRUNC('week', created_at)::date
      ORDER BY date DESC
      LIMIT 12
    `);

    // Get conversations over time (last 12 weeks)
    const conversationsOverTimeResult = await queryNeon(`
      SELECT
        DATE_TRUNC('week', created_at)::date as date,
        COUNT(*) as conversations
      FROM conversations
      WHERE created_at >= NOW() - INTERVAL '84 days'
      GROUP BY DATE_TRUNC('week', created_at)::date
      ORDER BY date DESC
      LIMIT 12
    `);

    // Get messages over time (last 12 weeks)
    const messagesOverTimeResult = await queryNeon(`
      SELECT
        DATE_TRUNC('week', created_at)::date as date,
        COUNT(*) as messages
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '84 days'
      GROUP BY DATE_TRUNC('week', created_at)::date
      ORDER BY date DESC
      LIMIT 12
    `);

    // Get agent distribution by model
    const agentsByModelResult = await queryNeon(`
      SELECT model, COUNT(*) as count
      FROM agents
      GROUP BY model
      ORDER BY count DESC
    `);

    // Get subscription distribution by plan
    const subscriptionsByPlanResult = await queryNeon(`
      SELECT plan_key, COUNT(*) as count
      FROM billing_plan_subscriptions
      WHERE status = 'active'
      GROUP BY plan_key
      ORDER BY count DESC
    `);

    return NextResponse.json(
      {
        metrics: {
          totalUsers: { value: totalUsers, format: "number", change: userGrowthRate },
          totalAgents: { value: totalAgents, format: "number" },
          totalConversations: { value: totalConversations, format: "number" },
          totalMessages: { value: totalMessages, format: "number" },
          activeSubscriptions: { value: activeSubscriptions, format: "number" },
          messagesLast30Days: { value: messagesLast30Days, format: "number" },
          conversationsLast30Days: { value: conversationsLast30Days, format: "number" },
          activatedUsers: { value: activatedUsers, format: "number" },
          userGrowthRate: { value: userGrowthRate, format: "percentage" },
          activationRate: {
            value: totalUsers > 0 ? (activatedUsers / totalUsers) * 100 : 0,
            format: "percentage"
          },
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
