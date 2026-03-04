import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db";

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
    const pgUrlPattern = /^postgresql(s?)?:\/\/.+$/;
    if (!pgUrlPattern.test(connectionString)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid connection string format. Expected: postgresql://user:password@host:port/database"
        },
        { status: 400 }
      );
    }

    // Test connection directly
    const client = await createClient(connectionString);

    try {
      await client.connect();
      const result = await client.query("SELECT 1 as test, version() as pg_version");
      await client.end();

      return NextResponse.json({
        success: true,
        message: "Connection successful!",
        data: {
          test: result.rows[0].test,
          pgVersion: result.rows[0].pg_version,
        },
      });
    } catch (queryError) {
      await client.end();
      throw queryError;
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
