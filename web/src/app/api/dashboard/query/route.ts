import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db";

export async function POST(request: NextRequest) {
  const client = await createClient();

  try {
    const { sql, params = [] } = await request.json();

    if (!sql || typeof sql !== "string") {
      return NextResponse.json(
        { error: "SQL query is required" },
        { status: 400 }
      );
    }

    await client.connect();

    try {
      const result = await client.query(sql, params);
      await client.end();

      return NextResponse.json({
        rows: result.rows,
        rowCount: result.rowCount,
        columns: result.fields.map((f: any) => f.name),
      });
    } catch (queryError) {
      await client.end();
      throw queryError;
    }
  } catch (error) {
    try { await client.end(); } catch {}
    console.error("Database query error:", error);
    return NextResponse.json(
      {
        error: "Database query failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
