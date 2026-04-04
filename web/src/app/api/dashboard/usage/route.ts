import { queryNeon } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// Cache for 10 minutes (600 seconds)
export const revalidate = 600
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  return await POST(request)
}

export async function POST(request: NextRequest) {
  try {
    // Get custom database URL from request body (for POST) or query param (for GET)
    let databaseUrl: string | undefined
    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}))
      databaseUrl = body.databaseUrl
    } else {
      databaseUrl = request.nextUrl.searchParams.get("databaseUrl") || undefined
    }

    // DAU - last 7 days (using messages table for more accurate activity)
    const dauResult = await queryNeon(
      `
      SELECT
        DATE_TRUNC('day', created_at)::date as date,
        COUNT(DISTINCT profile_id) as daily_users
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE_TRUNC('day', created_at)::date
      ORDER BY date
    `,
      [],
      databaseUrl
    )

    const avgDAU =
      dauResult.length > 0
        ? dauResult.reduce(
            (sum: number, r: any) =>
              sum + (Number.parseInt(r.daily_users) || 0),
            0
          ) / dauResult.length
        : 0

    // MAU
    const mauResult = await queryNeon(
      `
      SELECT COUNT(DISTINCT profile_id) as monthly_users
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `,
      [],
      databaseUrl
    )
    const mau = Number.parseInt((mauResult as any[])[0]?.monthly_users) || 1

    // DAU/MAU Ratio
    const dauMauRatio = mau > 0 ? (avgDAU / mau) * 100 : 0

    // Feature usage by source type
    const sourceUsageResult = await queryNeon(
      `
      SELECT
        source_type,
        COUNT(*) as conversations,
        COUNT(DISTINCT profile_id) as unique_users,
        SUM(message_count) as total_messages
      FROM conversations
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY source_type
      ORDER BY conversations DESC
    `,
      [],
      databaseUrl
    )

    const sourceUsage = sourceUsageResult.map((r: any) => ({
      source: r.source_type || "Unknown",
      conversations: Number.parseInt(r.conversations),
      users: Number.parseInt(r.unique_users),
      messages: Number.parseInt(r.total_messages) || 0,
    }))

    // Daily usage trend
    const dailyTrendResult = await queryNeon(
      `
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
    `,
      [],
      databaseUrl
    )

    // Agent adoption (total agents and unique creators)
    const agentResult = await queryNeon(
      `
      SELECT
        COUNT(*) as total_agents,
        COUNT(DISTINCT profile_id) as unique_creators
      FROM agents
    `,
      [],
      databaseUrl
    )
    const totalAgents =
      Number.parseInt((agentResult as any[])[0]?.total_agents) || 0
    const uniqueCreators =
      Number.parseInt((agentResult as any[])[0]?.unique_creators) || 0

    // Agents created in last 30 days
    const recentAgentsResult = await queryNeon(
      `
      SELECT COUNT(*) as recent_agents
      FROM agents
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `,
      [],
      databaseUrl
    )
    const recentAgents =
      Number.parseInt((recentAgentsResult as any[])[0]?.recent_agents) || 0

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
            labels: (dailyTrendResult as any[]).map((r: any) => {
              const date = new Date(r.date)
              return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }),
            dau: (dailyTrendResult as any[]).map((r: any) =>
              Number.parseInt(r.dau)
            ),
            conversations: (dailyTrendResult as any[]).map((r: any) =>
              Number.parseInt(r.conversations)
            ),
            messages: (dailyTrendResult as any[]).map(
              (r: any) => Number.parseInt(r.messages) || 0
            ),
          },
          sourceUsage,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      }
    )
  } catch (error) {
    console.error("Usage API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    )
  }
}
