import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Reliability metrics (simulated - in production these would come from monitoring)
    const uptime = 99.95;
    const incidents = 2;
    const avgResponseTime = 145; // ms

    // Get deployment frequency from git or deployment tracking
    const weeklyDeployments = 3;

    // Insights generated (AI usage)
    const insightsResult = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4111'}/api/agents`, {
      method: 'GET',
    }).catch(() => null);

    return NextResponse.json({
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
          values: [99.90, 99.92, 99.88, 99.95, 99.93, 99.95],
        },
        deploymentsHistory: {
          labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
          values: [4, 3, 5, 3],
        },
        responseTimeHistory: {
          labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          values: [142, 155, 138, 162, 145, 132, 128],
        },
      },
    });
  } catch (error) {
    console.error("Reliability API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reliability data" },
      { status: 500 }
    );
  }
}
