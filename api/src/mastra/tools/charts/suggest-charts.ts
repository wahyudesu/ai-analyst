/**
 * Suggest Charts Tool
 * Analyzes data and suggests multiple chart configurations
 */

import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { type ChartSuggestion, suggestChartTypes } from "./auto-detect.js"
import {
  buildChartResult,
  processPieChart,
  processXYChart,
} from "./data-processors.js"
import type { GenerateChartOutput, PieSlice, Series } from "./types.js"

const SQLQueryResultSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.any()),
  rowCount: z.number(),
  executionTime: z.number().optional(),
})

const chartTypes = ["bar", "line", "area", "pie"] as const

/**
 * Suggest Charts Tool
 * Analyzes SQL query results and suggests multiple chart configurations
 */
export const suggestChartsTool = createTool({
  id: "suggest-charts",
  description: `Analyze SQL query results and suggest multiple appropriate chart configurations.

This tool automatically:
- Detects data patterns (time series, categorical, numeric)
- Suggests suitable chart types (bar, line, area, pie)
- Selects optimal columns for x-axis and y-axis
- Configures appropriate aggregation and sorting

Use this when you want to explore data from different perspectives or need help choosing the best visualization.`,
  inputSchema: z.object({
    data: SQLQueryResultSchema.describe(
      "SQL query result from execute-sql tool"
    ),
    title: z.string().describe("Chart title"),
    subtitle: z.string().optional().describe("Chart subtitle"),
    chartTypes: z
      .array(z.enum(chartTypes))
      .optional()
      .describe(
        "Specific chart types to generate. If not specified, suggests all appropriate types."
      ),
  }),
  execute: async ({
    data,
    title,
    subtitle,
    chartTypes: requestedChartTypes,
  }): Promise<{
    charts: GenerateChartOutput[]
    suggestions: ChartSuggestion[]
  }> => {
    const suggestions = suggestChartTypes(data)

    const filteredSuggestions =
      requestedChartTypes && requestedChartTypes.length > 0
        ? suggestions.filter(s => requestedChartTypes.includes(s.chartType))
        : suggestions

    const charts: GenerateChartOutput[] = []

    for (const suggestion of filteredSuggestions) {
      const yAxisConfigs = [
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

      const chart = buildChartResult({
        chartType: suggestion.chartType,
        title,
        subtitle,
        processedData,
        options,
        xAxis: { label: suggestion.xColumn, type: suggestion.xAxisType },
        yAxisLabels: yAxisConfigs.map(y => y.label),
        dataSourceRowCount: data.rowCount,
        colorScheme: "default",
      })

      charts.push(chart)
    }

    return {
      charts,
      suggestions: filteredSuggestions,
    }
  },
})
