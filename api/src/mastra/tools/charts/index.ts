/**
 * Chart tools exports
 */

import { generateChartTool } from "./generate-chart.js"
import { suggestChartsTool } from "./suggest-charts.js"
import { sampleChartTool } from "./sample-chart.js"
import { generateMultipleChartsTool } from "./generate-multiple-charts.js"

export const chartTools = {
  generateChart: generateChartTool,
  suggestCharts: suggestChartsTool,
  sampleChart: sampleChartTool,
  generateMultipleCharts: generateMultipleChartsTool,
} as const

export { generateChartTool, suggestChartsTool, sampleChartTool, generateMultipleChartsTool }
export type {
  ChartType,
  AxisType,
  AggregationType,
  SortType,
  ColorScheme,
  SQLQueryResult,
  XAxisConfig,
  YAxisConfig,
  ChartOptions,
  GenerateChartInput,
  DataPoint,
  Series,
  PieSlice,
  ProcessedData,
  OutputXAxis,
  OutputYAxis,
  OutputOptions,
  ColorConfig,
  ChartMetadata,
  GenerateChartOutput,
} from "./types.js"

export type { MultipleChartsOutput } from "./generate-multiple-charts.js"
