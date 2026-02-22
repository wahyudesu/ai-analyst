import { NextResponse } from "next/server";
import { queryNeon } from "@/lib/db";

// Cache for 2 minutes (120 seconds)
export const revalidate = 120;
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // DAU - last 7 days (using messages table for more accurate activity)
    const dauResult = await queryNeon(`
      SELECT
        DATE_TRUNC('day', created_at)::date as date,
        COUNT(DISTINCT profile_id) as daily_users
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE_TRUNC('day', created_at)::date
      ORDER BY date
    `);

    const avgDAU = dauResult.length > 0
      ? dauResult.reduce((sum: number, r: any) => sum + (parseInt(r.daily_users) || 0), 0) / dauResult.length
      : 0;

    // MAU
    const mauResult = await queryNeon(`
      SELECT COUNT(DISTINCT profile_id) as monthly_users
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    const mau = parseInt((mauResult as any[])[0]?.monthly_users) || 1;

    // DAU/MAU Ratio
    const dauMauRatio = mau > 0 ? (avgDAU / mau) * 100 : 0;

    // Feature usage by source type
    const sourceUsageResult = await queryNeon(`
      SELECT
        source_type,
        COUNT(*) as conversations,
        COUNT(DISTINCT profile_id) as unique_users,
        SUM(message_count) as total_messages
      FROM conversations
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY source_type
      ORDER BY conversations DESC
    `);

    const sourceUsage = sourceUsageResult.map((r: any) => ({
      source: r.source_type || "Unknown",
      conversations: parseInt(r.conversations),
      users: parseInt(r.unique_users),
      messages: parseInt(r.total_messages) || 0,
    }));

    // Daily usage trend
    const dailyTrendResult = await queryNeon(`
      SELECT
        DATE_TRUNC('day', m.created_at)::date as date,
        COUNT(DISTINCT m.profile_id) as dau,
        COUNT(DISTINCT c.id) as conversations,
        COUNT(m.id) as messages
      FROM messages m
      LEFT JOIN conversations c ON m.conversation_id = c.id
      WHERE m.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', m.created_at)::date
      ORDER BY date
    `);

    // Agent adoption (total agents and unique creators)
    const agentResult = await queryNeon(`
      SELECT
        COUNT(*) as total_agents,
        COUNT(DISTINCT profile_id) as unique_creators
      FROM agents
    `);
    const totalAgents = parseInt((agentResult as any[])[0]?.total_agents) || 0;
    const uniqueCreators = parseInt((agentResult as any[])[0]?.unique_creators) || 0;

    // Agents created in last 30 days
    const recentAgentsResult = await queryNeon(`
      SELECT COUNT(*) as recent_agents
      FROM agents
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    const recentAgents = parseInt((recentAgentsResult as any[])[0]?.recent_agents) || 0;

    return NextResponse.json(
      {
        metrics: {
          dau: { value: Math.round(avgDAU), format: "number" },
          mau: { value: mau, format: "number" },
          dauMauRatio: { value: dauMauRatio, format: "percentage" },
          totalAgents: { value: totalAgents, format: "number" },
          uniqueCreators: { value: uniqueCreators, format: "number" },
          recentAgents: { value: recentAgents, format: "number" },
        },
        charts: {
          dailyTrend: {
            labels: (dailyTrendResult as any[]).map((r: any) => r.date),
            dau: (dailyTrendResult as any[]).map((r: any) => parseInt(r.dau)),
            conversations: (dailyTrendResult as any[]).map((r: any) => parseInt(r.conversations)),
            messages: (dailyTrendResult as any[]).map((r: any) => parseInt(r.messages) || 0),
          },
          sourceUsage,
        },
      },
      {
        headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
      }
    );
  } catch (error) {
    console.error("Usage API error:", error);
    return NextResponse.json({ error: "Failed to fetch usage data" }, { status: 500 });
  }
}
