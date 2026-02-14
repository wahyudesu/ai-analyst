import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { connectionString } = await req.json();

    if (!connectionString) {
      return NextResponse.json(
        { error: "Connection string is required" },
        { status: 400 }
      );
    }

    // Validate PostgreSQL connection string format
    const pgUrlPattern = /^postgresql(s)?:\/\/.+$/;
    if (!pgUrlPattern.test(connectionString)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid connection string format. Expected: postgresql://user:password@host:port/database"
        },
        { status: 400 }
      );
    }

    // Test the connection by calling the backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4111";

    try {
      const response = await fetch(`${backendUrl}/api/tools/execute-sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          connectionString,
          query: "SELECT 1 as test",
        }),
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          success: true,
          message: "Connection successful!",
          data,
        });
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        return NextResponse.json(
          {
            success: false,
            error: errorData.error || "Failed to connect to database",
          },
          { status: response.status }
        );
      }
    } catch (fetchError) {
      // If backend is not available, return a more specific error
      return NextResponse.json(
        {
          success: false,
          error: "Could not reach the backend API. Please ensure the API server is running.",
        },
        { status: 503 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
