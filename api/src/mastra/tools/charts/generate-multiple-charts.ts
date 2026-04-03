/**
 * Generate Multiple Charts Tool
 * Creates multiple chart configurations from a single dataset
 * Useful for dashboard-style visualizations
 */

import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { type ChartSuggestion, suggestChartTypes } from "./auto-detect.js"
import {
  buildChartResult,
  processPieChart,
  processXYChart,
} from "./data-processors.js"
import type {
  GenerateChartOutput,
  PieSlice,
  Series,
  YAxisConfig,
} from "./types.js"

const SQLQueryResultSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.any()),
  rowCount: z.number(),
  executionTime: z.number().optional(),
})

const chartTypes = ["bar", "line", "area", "pie"] as const

/**
 * Multiple Charts Output Format
 * Contains an array of charts that can be rendered together
 */
export interface MultipleChartsOutput {
  charts: GenerateChartOutput[]
  layout?: "grid" | "vertical" | "tabs"
  title?: string
  description?: string
}

/**
 * Generate Multiple Charts Tool
 * Creates several chart visualizations from SQL query results.
 * Ideal for exploring data from multiple angles.
 */
export const generateMultipleChartsTool = createTool({
  id: "generate-multiple-charts",
  description: `Generate multiple chart visualizations from SQL query results.

This tool creates several charts showing different perspectives of the same data:
- Detects optimal chart types for the dataset
- Creates multiple visualizations (bar, line, area, pie)
- Returns all charts in a structured format for dashboard rendering

Use this when you want to:
- Show comprehensive data analysis
- Create dashboard-style views
- Let users explore different visualization options
- Provide multiple insights from one dataset`,
  inputSchema: z.object({
    data: SQLQueryResultSchema.describe(
      "SQL query result from execute-sql tool"
    ),
    baseTitle: z.string().describe("Base title for the chart collection"),
    description: z
      .string()
      .optional()
      .describe("Description of what the charts show"),
    chartTypes: z
      .array(z.enum(chartTypes))
      .optional()
      .describe(
        "Specific chart types to generate. If not specified, generates all appropriate types."
      ),
    maxCharts: z
      .number()
      .optional()
      .default(4)
      .describe("Maximum number of charts to generate (default: 4)"),
    layout: z
      .enum(["grid", "vertical", "tabs"])
      .optional()
      .default("grid")
      .describe("Layout arrangement for the charts"),
  }),
  execute: async ({
    data,
    baseTitle,
    description,
    chartTypes: requestedChartTypes,
    maxCharts = 4,
    layout = "grid",
  }): Promise<MultipleChartsOutput> => {
    const suggestions = suggestChartTypes(data)

    // Filter by requested chart types or use all suggestions
    let filteredSuggestions =
      requestedChartTypes && requestedChartTypes.length > 0
        ? suggestions.filter(s => requestedChartTypes.includes(s.chartType))
        : suggestions

    // Limit to maxCharts
    filteredSuggestions = filteredSuggestions.slice(0, maxCharts)

    const charts: GenerateChartOutput[] = []

    for (const suggestion of filteredSuggestions) {
      const yAxisConfigs: YAxisConfig[] = [
        {
          column: suggestion.yColumn,
          label: suggestion.yColumn,
          aggregation: suggestion.aggregation,
        },
      ]

      const options = {
        legend: true,
        stacked: false,
        horizontal: false,
        showDataLabels: false,
        sort: suggestion.sort,
        limit: suggestion.chartType === "pie" ? 7 : 50,
      }

      let processedData: { series?: Series[]; slices?: PieSlice[] }

      if (suggestion.chartType === "pie") {
        processedData = {
          slices: processPieChart(data, yAxisConfigs, options),
        }
      } else {
        processedData = {
          series: processXYChart(
            data,
            suggestion.chartType,
            { column: suggestion.xColumn, type: suggestion.xAxisType },
            yAxisConfigs,
            options
          ),
        }
      }

      // Create specific title for each chart
      const chartTypeLabel =
        suggestion.chartType.charAt(0).toUpperCase() +
        suggestion.chartType.slice(1)
      const title = `${baseTitle} (${chartTypeLabel})`

      const chart = buildChartResult({
        chartType: suggestion.chartType,
        title,
        subtitle: description,
        processedData,
        options,
        xAxis: { label: suggestion.xColumn, type: suggestion.xAxisType },
        yAxisLabels: yAxisConfigs.map(y => y.label || y.column),
        dataSourceRowCount: data.rowCount,
        colorScheme: "default",
      })

      charts.push(chart)
    }

    return {
      charts,
      layout,
      title: baseTitle,
      description,
    }
  },
})
