/**
 * Type definitions for the chart generation tool
 */

// Chart type enum
export const chartTypes = ["bar", "line", "area", "pie"] as const
export type ChartType = (typeof chartTypes)[number]

// Axis types
export type AxisType = "category" | "time" | "number"

// Aggregation types
export type AggregationType = "none" | "sum" | "avg" | "count" | "min" | "max"

// Sort types
export type SortType = "asc" | "desc" | "none"

// Color schemes
export type ColorScheme = "default" | "categorical" | "sequential"

/**
 * SQL Query Result from execute-sql tool
 */
export interface SQLQueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  executionTime?: number
}

/**
 * X-axis configuration
 */
export interface XAxisConfig {
  column: string
  label?: string
  type?: AxisType
  dateFormat?: string
}

/**
 * Y-axis / Series configuration
 */
export interface YAxisConfig {
  column: string
  label?: string
  color?: string
  aggregation?: AggregationType
}

/**
 * Display options
 */
export interface ChartOptions {
  legend?: boolean
  stacked?: boolean
  horizontal?: boolean
  showDataLabels?: boolean
  sort?: SortType
  limit?: number
}

/**
 * Input schema for generate-chart tool
 */
export interface GenerateChartInput {
  // Data source
  data: SQLQueryResult

  // Chart configuration
  chartType: ChartType

  // X-axis configuration (optional for pie charts)
  xAxis?: XAxisConfig

  // Y-axis / Series configuration
  yAxis: YAxisConfig[]

  // Metadata
  title: string
  subtitle?: string

  // Display options
  options?: ChartOptions

  // Color scheme
  colorScheme?: ColorScheme
  primaryColor?: string
}

/**
 * Data point for series (bar/line/area charts)
 */
export interface DataPoint {
  x: string | number
  y: number
  label?: string
}

/**
 * Series data for bar/line/area charts
 */
export interface Series {
  name: string
  data: DataPoint[]
  color?: string
}

/**
 * Slice data for pie charts
 */
export interface PieSlice {
  name: string
  value: number
  color?: string
  percentage?: number
}

/**
 * Processed data for rendering
 */
export interface ProcessedData {
  // For bar/line/area charts
  series?: Series[]
  // For pie charts
  slices?: PieSlice[]
}

/**
 * Output X-axis configuration
 */
export interface OutputXAxis {
  label: string
  type: AxisType
  dateFormat?: string
}

/**
 * Output Y-axis configuration
 */
export interface OutputYAxis {
  label: string
}

/**
 * Output display options
 */
export interface OutputOptions {
  legend: boolean
  stacked: boolean
  horizontal: boolean
  showDataLabels: boolean
}

/**
 * Color configuration
 */
export interface ColorConfig {
  palette: string[]
  primary?: string
}

/**
 * Metadata
 */
export interface ChartMetadata {
  dataSourceRowCount: number
  displayedPointCount: number
  generatedAt: string
}

/**
 * Output schema for generate-chart tool
 */
export interface GenerateChartOutput {
  chartType: ChartType
  title: string
  subtitle?: string

  // Processed data for rendering
  data: ProcessedData

  // Axis configuration
  xAxis?: OutputXAxis
  yAxis?: OutputYAxis[]

  // Display options
  options: OutputOptions

  // Styling
  colors: ColorConfig

  // Metadata
  metadata: ChartMetadata
}
