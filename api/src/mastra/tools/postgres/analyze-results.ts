/**
 * Query Results Analysis Tool
 * Automatically analyzes SQL query results and provides insights
 */

import { createTool } from "@mastra/core/tools"
import { z } from "zod"

const SQLQueryResultSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.any()),
  rowCount: z.number(),
})

export const analyzeResultsTool = createTool({
  id: "analyze-results",
  description: `Analyze SQL query results and automatically detect insights.

This tool analyzes query results to find:
- Summary statistics (min, max, avg, median)
- Patterns and trends
- Outliers and anomalies
- Data quality issues

Use this after executeSQL to provide automatic insights about the data.`,
  inputSchema: z.object({
    data: SQLQueryResultSchema.describe("Query result from execute-sql tool"),
  }),
  execute: async ({ data }) => {
    const { columns, rows, rowCount } = data
    const insights: string[] = []
    const patterns: string[] = []
    const outliers: string[] = []

    // Basic summary
    insights.push(`**Data Summary:**`)
    insights.push(`- Rows returned: ${rowCount}`)
    insights.push(`- Columns: ${columns.join(", ")}`)

    if (rowCount === 0) {
      return {
        insights: ["No data returned by the query."],
        patterns: [],
        outliers: [],
        summary: { rowCount: 0, columns },
      }
    }

    // Analyze numeric columns
    for (const col of columns) {
      const values = rows
        .map(r => r[col])
        .filter(v => v !== null && v !== undefined)

      // Check for numeric
      const numericValues = values.filter(
        v => typeof v === "number" && !isNaN(v)
      )

      if (numericValues.length > 0) {
        const min = Math.min(...numericValues)
        const max = Math.max(...numericValues)
        const sum = numericValues.reduce((a, b) => a + b, 0)
        const avg = sum / numericValues.length

        // Find median
        const sorted = [...numericValues].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        const median =
          sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2

        insights.push(`\n**Column: ${col}** (numeric)`)
        insights.push(`- Min: ${min}, Max: ${max}`)
        insights.push(`- Average: ${avg.toFixed(2)}, Median: ${median}`)
        insights.push(`- Total: ${sum.toLocaleString()}`)

        // Detect outliers (values > 3 standard deviations from mean)
        const variance =
          numericValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
          numericValues.length
        const stdDev = Math.sqrt(variance)

        for (const val of numericValues) {
          if (Math.abs(val - avg) > 3 * stdDev) {
            outliers.push(
              `**Outlier in ${col}:** ${val} (more than 3σ from mean ${avg.toFixed(2)})`
            )
          }
        }
      } else {
        // Categorical/string column analysis
        const counts = new Map<string, number>()
        for (const val of values) {
          const key = String(val)
          counts.set(key, (counts.get(key) || 0) + 1)
        }

        const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
        const topValue = sorted[0]
        const uniqueCount = sorted.length

        if (topValue && uniqueCount < rowCount) {
          const percentage = ((topValue[1] / rowCount) * 100).toFixed(2)
          insights.push(`\n**Column: ${col}** (categorical)`)
          insights.push(
            `- Most common: "${topValue[0]}" (${topValue[1]}x, ${percentage}%)`
          )
          insights.push(`- Unique values: ${uniqueCount}`)

          patterns.push(
            `In "${col}": "${topValue[0]}" is most common (${percentage}%)`
          )
        }

        // Check for distribution skew
        if (sorted.length > 1) {
          const topPercent = (sorted[0][1] / rowCount) * 100
          if (topPercent > 70) {
            patterns.push(
              `**Skewed distribution in ${col}:** Top value accounts for ${topPercent.toFixed(2)}%`
            )
          }
        }
      }
    }

    // Detect time patterns
    const dateColumns = columns.filter(col =>
      /date|time|year|month|day|created|updated/i.test(col)
    )

    for (const col of dateColumns) {
      const values = rows
        .map(r => r[col])
        .filter(v => v !== null && v !== undefined)

      if (values.length > 0) {
        // Try to parse as dates
        const dates = values
          .map(v => new Date(v))
          .filter(d => !isNaN(d.getTime()))

        if (dates.length > values.length * 0.5) {
          const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
          const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
          insights.push(`\n**Time range in ${col}:**`)
          insights.push(`- From: ${minDate.toLocaleDateString()}`)
          insights.push(`- To: ${maxDate.toLocaleDateString()}`)
        }
      }
    }

    // Detect empty/null patterns
    for (const col of columns) {
      const nullCount = rows.filter(
        r => r[col] === null || r[col] === undefined
      ).length
      if (nullCount > 0) {
        const nullPercent = ((nullCount / rowCount) * 100).toFixed(2)
        if (Number.parseFloat(nullPercent) > 10) {
          insights.push(
            `⚠️ **"${col}" has ${nullCount} null values (${nullPercent}%)`
          )
        }
      }
    }

    return {
      insights: insights.join("\n"),
      patterns,
      outliers,
      summary: {
        rowCount,
        columnCount: columns.length,
        numericColumns: columns.filter(col =>
          rows.some(r => typeof r[col] === "number")
        ),
      },
    }
  },
})
