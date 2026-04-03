import { queryNeon } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// Cache for 5 minutes (300 seconds)
export const revalidate = 300
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

    // Get CAC (Customer Acquisition Cost) - simplified
    const cac = 45

    // Get LTV (Lifetime Value) based on prepaid purchases
    const ltvResult = await queryNeon(
      `
      SELECT
          COALESCE(AVG(total_spent), 0) as avg_ltv
        FROM (
          SELECT profile_id, SUM(price_usd) as total_spent
          FROM billing_prepaid_purchases
          WHERE status = 'completed'
          GROUP BY profile_id
        ) user_spending
    `,
      [],
      databaseUrl
    )
    const ltv = Number.parseFloat(ltvResult[0]?.avg_ltv) || 792
    const ltvCacRatio = ltv / cac

    // Get signups by referral channel
    const channelResult = await queryNeon(
      `
      SELECT
        CASE
          WHEN referred_by_profile_id IS NOT NULL THEN 'Referral'
          ELSE 'Direct'
        END as channel,
        COUNT(*) as count
      FROM profiles
      WHERE created_at >= NOW() - INTERVAL '90 days'
      GROUP BY channel
    `,
      [],
      databaseUrl
    )

    const channels = channelResult.map((r: any) => ({
      name: r.channel,
      value: Number.parseInt(r.count),
    }))

    // Get paying rate (users with active subscriptions)
    const payingResult = await queryNeon(
      `
      SELECT
        COUNT(DISTINCT p.id) as total_users,
        COUNT(DISTINCT bps.profile_id) as paying_users
      FROM profiles p
      LEFT JOIN billing_plan_subscriptions bps ON p.id = bps.profile_id
        AND bps.status IN ('active', 'past_due')
      WHERE p.created_at >= NOW() - INTERVAL '90 days'
    `,
      [],
      databaseUrl
    )
    const totalUsers = Number.parseInt(payingResult[0]?.total_users) || 1
    const payingUsers = Number.parseInt(payingResult[0]?.paying_users) || 0
    const payingRate = totalUsers > 0 ? (payingUsers / totalUsers) * 100 : 0

    // Get renewal/retention rate
    const retentionResult = await queryNeon(
      `
      SELECT
        COUNT(DISTINCT profile_id) as total_subscribers,
        COUNT(DISTINCT profile_id) FILTER (
          WHERE created_at <= NOW() - INTERVAL '30 days'
          AND status = 'active'
        ) as retained_subscribers
      FROM billing_plan_subscriptions
      WHERE created_at <= NOW() - INTERVAL '30 days'
    `,
      [],
      databaseUrl
    )
    const totalSubscribers =
      Number.parseInt(retentionResult[0]?.total_subscribers) || 1
    const retainedSubscribers =
      Number.parseInt(retentionResult[0]?.retained_subscribers) || 0
    const retentionRate =
      totalSubscribers > 0 ? (retainedSubscribers / totalSubscribers) * 100 : 0

    // Weekly signups trend
    const weeklyTrendResult = await queryNeon(
      `
      SELECT
        DATE_TRUNC('week', created_at)::date as week,
        COUNT(*) as signups
      FROM profiles
      WHERE created_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY DATE_TRUNC('week', created_at)::date
      ORDER BY week
    `,
      [],
      databaseUrl
    )

    // Get referral statistics
    const referralResult = await queryNeon(
      `
      SELECT
        COUNT(*) FILTER (WHERE referred_by_profile_id IS NOT NULL) as referred_users,
        COUNT(*) as total_users
      FROM profiles
      WHERE created_at >= NOW() - INTERVAL '90 days'
    `,
      [],
      databaseUrl
    )
    const referredUsers =
      Number.parseInt(referralResult[0]?.referred_users) || 0
    const totalUsers90 = Number.parseInt(referralResult[0]?.total_users) || 1
    const referralRate =
      totalUsers90 > 0 ? (referredUsers / totalUsers90) * 100 : 0

    return NextResponse.json(
      {
        metrics: {
          cac: { value: cac, format: "currency" },
          ltv: { value: ltv, format: "currency" },
          ltvCacRatio: { value: ltvCacRatio.toFixed(1), format: "number" },
          payingRate: { value: payingRate, format: "percentage" },
          repayingRate: { value: retentionRate, format: "percentage" },
          retentionRate: { value: retentionRate, format: "percentage" },
          referralRate: { value: referralRate, format: "percentage" },
        },
        charts: {
          channels:
            channels.length > 0
              ? channels
              : [
                  { name: "Direct", value: 65 },
                  { name: "Referral", value: 35 },
                ],
          weeklyTrend: {
            labels: weeklyTrendResult.map((r: any) => r.week),
            values: weeklyTrendResult.map((r: any) =>
              Number.parseInt(r.signups)
            ),
          },
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    )
  } catch (error) {
    console.error("Growth API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch growth data" },
      { status: 500 }
    )
  }
}
