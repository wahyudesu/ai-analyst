import { NextResponse } from "next/server"

// Cache for 10 minutes (600 seconds)
export const revalidate = 600
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Reliability metrics (simulated - in production these would come from monitoring)
    const uptime = 99.95
    const incidents = 2
    const avgResponseTime = 145 // ms

    // Get deployment frequency from git or deployment tracking
    const weeklyDeployments = 3

    // Insights generated (AI usage)
    const insightsResult = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_MASTRA_URL || "http://localhost:4111"}/api/agents`,
      {
        method: "GET",
      }
    ).catch(() => null)

    return NextResponse.json(
      {
        metrics: {
          uptime: {
            value: uptime,
            format: "percentage",
          },
          incidents: {
            value: incidents,
            format: "number",
          },
          avgResponseTime: {
            value: avgResponseTime,
            format: "number",
          },
          weeklyDeployments: {
            value: weeklyDeployments,
            format: "number",
          },
        },
        charts: {
          uptimeHistory: {
            labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            values: [99.9, 99.92, 99.88, 99.95, 99.93, 99.95],
          },
          deploymentsHistory: {
            labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
            values: [4, 3, 5, 3],
          },
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      }
    )
  } catch (error) {
    console.error("Reliability API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch reliability data" },
      { status: 500 }
    )
  }
}
