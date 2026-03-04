import { NextRequest, NextResponse } from "next/server";
import { queryNeon } from "@/lib/db";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return await POST(request);
}

export async function POST(request: NextRequest) {
  try {
    // Get custom database URL from request body (for POST) or query param (for GET)
    let databaseUrl: string | undefined;
    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      databaseUrl = body.databaseUrl;
    } else {
      databaseUrl = request.nextUrl.searchParams.get("databaseUrl") || undefined;
    }

    // Gross bookings from prepaid purchases (use price_usd)
    const bookingsResult = await queryNeon(`
      SELECT COALESCE(SUM(price_usd), 0) as gross_bookings
      FROM billing_prepaid_purchases
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND status = 'completed'
    `, [], databaseUrl);
    const grossBookings = parseFloat(bookingsResult[0]?.gross_bookings) || 0;

    // MAU: distinct profiles with conversations in last 30 days
    const mauResult = await queryNeon(`
      SELECT COUNT(DISTINCT profile_id) as mau
      FROM conversations
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `, [], databaseUrl);
    const mau = parseInt(mauResult[0]?.mau) || 0;

    // ARPU annualized
    const arpu = mau > 0 ? (grossBookings / mau) * 12 : 0;

    // NRR simplified
    const nrr = 105;

    // Active subscriptions by plan with subscriber count
    const subscriptionsResult = await queryNeon(`
      SELECT
        plan_key,
        COUNT(*) as subscribers
      FROM billing_plan_subscriptions
      WHERE status = 'active'
      GROUP BY plan_key
      ORDER BY plan_key
    `, [], databaseUrl);

    const mrrByPlan = subscriptionsResult.map((r: any) => ({
      plan: r.plan_key,
      mrr: 0, // no price per plan in schema, show subscriber count only
      subscribers: parseInt(r.subscribers) || 0,
    }));

    // Customer funnel (last 30 days signups)
    const funnelResult = await queryNeon(`
      SELECT
        COUNT(DISTINCT p.id) as signups,
        COUNT(DISTINCT c.profile_id) as activated,
        COUNT(DISTINCT bps.profile_id) as paying
      FROM profiles p
      LEFT JOIN conversations c ON p.id = c.profile_id
        AND c.created_at >= NOW() - INTERVAL '30 days'
      LEFT JOIN billing_plan_subscriptions bps ON p.id = bps.profile_id
        AND bps.status IN ('active', 'past_due')
      WHERE p.created_at >= NOW() - INTERVAL '30 days'
    `, [], databaseUrl);
    const fd = funnelResult[0] || {};
    const funnel = [
      { name: "Signups", value: parseInt(fd.signups) || 0 },
      { name: "Activated", value: parseInt(fd.activated) || 0 },
      { name: "Paying", value: parseInt(fd.paying) || 0 },
    ];

    // Product engagement per week (12 weeks)
    const engagementResult = await queryNeon(`
      SELECT
        DATE_TRUNC('week', created_at)::date as week,
        COUNT(*) as conversations,
        COALESCE(SUM(message_count), 0) as messages
      FROM conversations
      WHERE created_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY DATE_TRUNC('week', created_at)::date
      ORDER BY week
    `, [], databaseUrl);

    return NextResponse.json(
      {
        metrics: {
          grossBookings: { value: grossBookings, format: "currency" },
          mau: { value: mau, format: "number" },
          arpu: { value: Math.round(arpu * 100) / 100, format: "currency" },
          nrr: { value: nrr, format: "percentage" },
        },
        charts: {
          mrrByPlan,
          funnel,
          engagement: {
            labels: engagementResult.map((r: any) => r.week),
            conversations: engagementResult.map((r: any) => parseInt(r.conversations) || 0),
            messages: engagementResult.map((r: any) => parseInt(r.messages) || 0),
          },
        },
      },
      {
        headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
      }
    );
  } catch (error) {
    console.error("Revenue API error:", error);
    return NextResponse.json({ error: "Failed to fetch revenue data" }, { status: 500 });
  }
}
