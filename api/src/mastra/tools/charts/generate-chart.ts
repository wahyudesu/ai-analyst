/**
 * Main chart generation tool
 * Creates visualization specifications from SQL query results
 */

import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import {
  type DetectedColumn,
  analyzeColumns,
  detectAggregation,
  detectAxisType,
  detectSort,
  selectXAxisColumn,
  selectYAxisColumn,
} from "./auto-detect.js"
import {
  buildChartResult,
  processPieChart,
  processXYChart,
} from "./data-processors.js"
import type {
  AggregationType,
  ChartType,
  GenerateChartOutput,
  PieSlice,
  Series,
  SortType,
} from "./types.js"

const chartTypes = ["bar", "line", "area", "pie"] as const
const aggregationTypes = ["none", "sum", "avg", "count", "min", "max"] as const
const sortTypes = ["asc", "desc", "none"] as const

const SQLQueryResultSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.any()),
  rowCount: z.number(),
  executionTime: z.number().optional(),
})

/**
 * Generate Chart Tool (Simplified)
 * Creates chart configurations from SQL query results with smart auto-detection
 */
export const generateChartTool = createTool({
  id: "generate-chart",
  description: `Generate chart visualizations from SQL query results.
IMPORTANT: Use this AFTER executeSQL tool to visualize the data. Pass the entire result from executeSQL as the 'data' parameter.

Creates chart configurations for frontend rendering using Recharts.

Choose appropriate chart types:
- bar: Comparisons across categories (e.g., "sales by month", "top products")
- line: Trends over time (e.g., "stock prices over time", "user growth")
- area: Volume/magnitude over time (e.g., "website traffic", "cumulative revenue")
- pie: Proportions of a whole (max 5-7 categories, e.g., "sales by category")

Auto-detection (works if you don't specify columns):
- xColumn: Auto-detected from date/keyword columns if not specified
- yColumns: Auto-detected from numeric/value columns if not specified
- axis type: Inferred from data (time/category/number)
- aggregation: Auto-sum for duplicates, none otherwise
- sort: Pie charts → desc, Time series → asc, others → none

Usage: Pass the result from executeSQL directly as 'data', specify chartType and title. The tool will auto-detect columns.`,
  inputSchema: z.object({
    data: SQLQueryResultSchema.describe(
      "SQL query result from execute-sql tool"
    ),
    chartType: z
      .enum(chartTypes)
      .describe("Type of chart: bar, line, area, or pie"),
    xColumn: z
      .string()
      .optional()
      .describe("Column name for x-axis. Auto-detected if not specified."),
    yColumns: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(
        'Column name(s) for y-axis/series. Pass as string for single column: "jumlah" or as array: ["jumlah", "count"]. Auto-detected from numeric columns if not specified.'
      ),
    title: z.string().describe("Chart title"),
    subtitle: z.string().optional().describe("Chart subtitle"),
    aggregation: z
      .enum(aggregationTypes)
      .optional()
      .describe("Aggregation method. Auto-detected based on data pattern."),
    sort: z
      .enum(sortTypes)
      .optional()
      .describe("Sort order. Auto-detected based on chart type and axis type."),
    limit: z
      .number()
      .optional()
      .describe(
        "Max data points to display. Auto-defaulted (50 for XY, 7 for pie)."
      ),
    stacked: z
      .boolean()
      .optional()
      .describe("Stack series (for bar/area charts). Default: false"),
    showDataLabels: z
      .boolean()
      .optional()
      .describe("Show data labels on chart. Default: false"),
  }),
  execute: async ({
    data,
    chartType,
    xColumn,
    yColumns,
    title,
    subtitle,
    aggregation,
    sort,
    limit,
    stacked = false,
    showDataLabels = false,
  }): Promise<GenerateChartOutput> => {
    const columns = analyzeColumns(data)

    const xAxisColumn = xColumn || selectXAxisColumn(columns)?.name

    // Parse yColumns if it's a stringified JSON array (common when LLM passes it as string)
    let parsedYColumns = yColumns
    if (typeof yColumns === "string") {
      // Try to parse as JSON array
      if (yColumns.startsWith("[") && yColumns.endsWith("]")) {
        try {
          parsedYColumns = JSON.parse(yColumns) as string | string[]
        } catch {
          // If parsing fails, use as-is (single column name)
          parsedYColumns = yColumns
        }
      }
    }

    const yAxisColumns = parsedYColumns || selectYAxisColumn(columns)?.name

    if (!xAxisColumn) {
      throw new Error(
        "No suitable x-axis column found. Please specify xColumn explicitly."
      )
    }

    if (!yAxisColumns) {
      throw new Error(
        "No suitable y-axis column found. Please specify yColumns explicitly."
      )
    }

    const yCols = Array.isArray(yAxisColumns) ? yAxisColumns : [yAxisColumns]

    const xAxisType = detectAxisType(data, xAxisColumn)
    const autoAggregation =
      aggregation ?? detectAggregation(data, xAxisColumn, chartType)
    const autoSort = sort ?? detectSort(chartType, xAxisType)

    const yAxisConfigs = yCols.map(col => ({
      column: col,
      label: col,
      aggregation: autoAggregation,
    }))

    const options = {
      legend: true,
      stacked,
      horizontal: false,
      showDataLabels,
      sort: autoSort,
      limit: limit || (chartType === "pie" ? 7 : 50),
    }

    let processedData: { series?: Series[]; slices?: PieSlice[] }

    if (chartType === "pie") {
      processedData = {
        slices: processPieChart(data, yAxisConfigs, options),
      }
    } else {
      processedData = {
        series: processXYChart(
          data,
          chartType,
          { column: xAxisColumn, type: xAxisType },
          yAxisConfigs,
          options
        ),
      }
    }

    return buildChartResult({
      chartType,
      title,
      subtitle,
      processedData,
      options,
      xAxis: { label: xAxisColumn, type: xAxisType },
      yAxisLabels: yAxisConfigs.map(y => y.label),
      dataSourceRowCount: data.rowCount,
      colorScheme: "default",
    })
  },
})
