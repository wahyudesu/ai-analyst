/**
 * Dashboard database utilities for PostgreSQL
 */

export interface MetricRow {
  [key: string]: any
}

/**
 * Execute SQL query against Neon PostgreSQL database
 * @param sql - SQL query string
 * @param params - Query parameters
 * @param databaseUrl - Optional custom database URL (from UI settings)
 */
export async function queryNeon(
  sql: string,
  params: any[] = [],
  databaseUrl?: string
): Promise<any[]> {
  try {
    // Use the internal API route to query the database
    const response = await fetch("/api/dashboard/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params, databaseUrl }),
    })

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`)
    }

    const result = await response.json()
    return result.rows || []
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  }
}

/**
 * Helper to format currency
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Helper to format percentage
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Helper to format large numbers
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}

/**
 * Get date range for queries
 */
export function getDateRange(days = 30): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return { start, end }
}

/**
 * Convert database row to chart data point
 */
export function rowToDataPoint(
  row: any,
  xKey: string,
  yKey: string,
  labelKey?: string
): { x: string | number; y: number; label?: string } {
  return {
    x: row[xKey],
    y: row[yKey],
    label: labelKey ? row[labelKey] : undefined,
  }
}
