/**
 * Mastra API integration for database queries
 * Direct SQL execution via Mastra's /sql endpoint (bypasses agent reasoning)
 */

const MASTRA_URL =
  process.env.MASTRA_URL ||
  process.env.NEXT_PUBLIC_MASTRA_URL ||
  "http://localhost:4111"

export interface SqlRow {
  [column: string]: string | number | boolean | null
}

/**
 * Execute a SQL query via Mastra API's direct SQL endpoint
 * This bypasses agent reasoning for much faster query execution
 */
export async function executeSQL(query: string): Promise<SqlRow[]> {
  try {
    const response = await fetch(`${MASTRA_URL}/api/sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(
        error.message || `Mastra API error: ${response.statusText}`
      )
    }

    const result = await response.json()
    return result.rows || []
  } catch (error) {
    console.error("Mastra SQL execution error:", error)
    throw error
  }
}

export interface TableInfo {
  name: string
  type: string
}

/**
 * Get database schema via Mastra API
 */
export async function getSchema(): Promise<TableInfo[]> {
  const response = await executeSQL(`
    SELECT
      table_name as name,
      table_type as type
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `)
  return response.map((row) => ({
    name: String(row.name),
    type: String(row.type),
  }))
}

export interface ColumnInfo {
  table_name: string
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
}

/**
 * Get table schema via Mastra API
 */
export async function getTable(
  tableNames: string[]
): Promise<ColumnInfo[]> {
  const tables = tableNames.map((t) => `'${t}'`).join(",")
  const response = await executeSQL(`
    SELECT
      table_name,
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (${tables})
    ORDER BY table_name, ordinal_position
  `)
  return response.map((row) => ({
    table_name: String(row.table_name),
    column_name: String(row.column_name),
    data_type: String(row.data_type),
    is_nullable: String(row.is_nullable),
    column_default: row.column_default === null ? null : String(row.column_default),
  }))
}
