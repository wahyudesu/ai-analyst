import { createClient } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  let client: Awaited<ReturnType<typeof createClient>> | null = null

  try {
    const { sql, params = [], databaseUrl } = await request.json()

    if (!sql || typeof sql !== "string") {
      return NextResponse.json(
        { error: "SQL query is required" },
        { status: 400 }
      )
    }

    client = await createClient(databaseUrl)
    await client.connect()

    try {
      const result = await client.query(sql, params)
      await client.end()
      client = null

      return NextResponse.json({
        rows: result.rows,
        rowCount: result.rowCount,
        columns: result.fields.map((f: any) => f.name),
      })
    } catch (queryError) {
      if (client) {
        await client.end()
      }
      throw queryError
    }
  } catch (error) {
    if (client) {
      try {
        await client.end()
      } catch {}
    }
    console.error("Database query error:", error)
    return NextResponse.json(
      {
        error: "Database query failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
