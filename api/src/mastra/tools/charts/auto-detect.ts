/**
 * Auto-detection utilities for chart generation
 * Analyzes SQL query results to suggest appropriate chart configurations
 */

import type {
  AggregationType,
  AxisType,
  ChartType,
  SQLQueryResult,
  SortType,
} from "./types.js"

/**
 * Column type detected from data
 */
export type ColumnType = "numeric" | "date" | "string" | "category"

/**
 * Detected column information
 */
export interface DetectedColumn {
  name: string
  type: ColumnType
  isNumeric: boolean
  hasDateKeywords: boolean
  hasValueKeywords: boolean
  uniqueCount: number
  sampleValue: unknown
}

/**
 * Chart type suggestion with reasoning
 */
export interface ChartSuggestion {
  chartType: ChartType
  xColumn: string
  yColumn: string
  xAxisType: AxisType
  aggregation: AggregationType
  sort: SortType
  reasoning: string
  confidence: "high" | "medium" | "low"
}

/**
 * Analyze data and detect columns types
 */
export function analyzeColumns(data: SQLQueryResult): DetectedColumn[] {
  const { columns, rows } = data

  return columns.map(col => {
    const type = detectColumnType(rows, col)
    const isNumeric = type === "numeric"
    const hasDateKeywords = hasKeywords(col.toLowerCase(), [
      "date",
      "time",
      "year",
      "month",
      "day",
      "created_at",
      "updated_at",
    ])
    const hasValueKeywords = hasKeywords(col.toLowerCase(), [
      "amount",
      "value",
      "count",
      "sum",
      "total",
      "price",
      "quantity",
      "sales",
      "revenue",
      "cost",
    ])
    const uniqueCount = countUniqueValues(rows, col)
    const sampleValue = rows.length > 0 ? rows[0][col] : null

    return {
      name: col,
      type,
      isNumeric,
      hasDateKeywords,
      hasValueKeywords,
      uniqueCount,
      sampleValue,
    }
  })
}

/**
 * Detect column type from data values
 */
function detectColumnType(
  rows: Record<string, unknown>[],
  column: string
): ColumnType {
  if (rows.length === 0) return "string"

  const sampleSize = Math.min(rows.length, 100)
  let numericCount = 0
  let dateCount = 0

  for (let i = 0; i < sampleSize; i++) {
    const value = rows[i][column]

    if (value === null || value === undefined) continue

    if (typeof value === "number" && !Number.isNaN(value)) {
      numericCount++
    } else if (typeof value === "string") {
      const date = new Date(value)
      if (!Number.isNaN(date.getTime())) {
        dateCount++
      }
    }
  }

  const threshold = sampleSize * 0.7 // 70% of values must match

  if (numericCount >= threshold) return "numeric"
  if (dateCount >= threshold) return "date"

  // Check unique count vs row count
  const uniqueCount = countUniqueValues(rows, column)
  if (uniqueCount <= Math.max(5, rows.length * 0.2)) {
    return "category"
  }

  return "string"
}

/**
 * Count unique values in a column
 */
function countUniqueValues(
  rows: Record<string, unknown>[],
  column: string
): number {
  const unique = new Set()
  for (const row of rows) {
    const value = row[column]
    unique.add(value)
  }
  return unique.size
}

/**
 * Check if string contains any of the keywords
 */
function hasKeywords(str: string, keywords: string[]): boolean {
  return keywords.some(kw => str.includes(kw))
}

/**
 * Suggest best chart types based on data analysis
 */
export function suggestChartTypes(data: SQLQueryResult): ChartSuggestion[] {
  const columns = analyzeColumns(data)
  const suggestions: ChartSuggestion[] = []

  const xColumnCandidate = selectXAxisColumn(columns)
  const yColumnCandidate = selectYAxisColumn(columns)

  if (!xColumnCandidate || !yColumnCandidate) {
    // Not enough suitable columns
    return suggestions
  }

  // Determine data pattern
  const isTimeSeries =
    xColumnCandidate.type === "date" || xColumnCandidate.hasDateKeywords
  const isCategorical = xColumnCandidate.type === "category"
  const hasManyCategories = xColumnCandidate.uniqueCount > 10
  const yUniqueCount = yColumnCandidate.uniqueCount

  // Time series: suggest line, area, bar
  if (isTimeSeries) {
    suggestions.push({
      chartType: "line",
      xColumn: xColumnCandidate.name,
      yColumn: yColumnCandidate.name,
      xAxisType: "time",
      aggregation: "none",
      sort: "asc",
      reasoning: "Time series data - line chart shows trends over time",
      confidence: "high",
    })

    suggestions.push({
      chartType: "area",
      xColumn: xColumnCandidate.name,
      yColumn: yColumnCandidate.name,
      xAxisType: "time",
      aggregation: "none",
      sort: "asc",
      reasoning: "Time series data - area chart shows volume/magnitude",
      confidence: "medium",
    })

    if (!hasManyCategories) {
      suggestions.push({
        chartType: "bar",
        xColumn: xColumnCandidate.name,
        yColumn: yColumnCandidate.name,
        xAxisType: "time",
        aggregation: "none",
        sort: "asc",
        reasoning: "Time series data - bar chart shows comparisons",
        confidence: "medium",
      })
    }
  }

  // Categorical: suggest bar, pie (if few categories)
  if (isCategorical || xColumnCandidate.type === "string") {
    suggestions.push({
      chartType: "bar",
      xColumn: xColumnCandidate.name,
      yColumn: yColumnCandidate.name,
      xAxisType: "category",
      aggregation: yUniqueCount > 1 ? "sum" : "none",
      sort: "desc",
      reasoning: "Categorical data - bar chart shows comparisons",
      confidence: "high",
    })

    // Pie chart only if <= 7 categories
    if (xColumnCandidate.uniqueCount <= 7) {
      suggestions.push({
        chartType: "pie",
        xColumn: xColumnCandidate.name,
        yColumn: yColumnCandidate.name,
        xAxisType: "category",
        aggregation: "sum",
        sort: "desc",
        reasoning: `Few categories (${xColumnCandidate.uniqueCount}) - pie chart shows proportions`,
        confidence: "medium",
      })
    }
  }

  // Numeric x-axis: suggest scatter-like patterns as bar
  if (xColumnCandidate.type === "numeric" && !isTimeSeries) {
    suggestions.push({
      chartType: "bar",
      xColumn: xColumnCandidate.name,
      yColumn: yColumnCandidate.name,
      xAxisType: "number",
      aggregation: "none",
      sort: "asc",
      reasoning: "Numeric x-axis - bar chart shows relationship",
      confidence: "medium",
    })
  }

  return suggestions
}

/**
 * Select best column for x-axis
 */
export function selectXAxisColumn(
  columns: DetectedColumn[]
): DetectedColumn | null {
  // Priority: date keyword → date type → category → string with few unique → first non-numeric
  const dateKeywordCol = columns.find(c => c.hasDateKeywords)
  if (dateKeywordCol && !dateKeywordCol.isNumeric) return dateKeywordCol

  const dateTypeCol = columns.find(c => c.type === "date")
  if (dateTypeCol) return dateTypeCol

  const categoryCol = columns.find(c => c.type === "category")
  if (categoryCol) return categoryCol

  const stringCol = columns.find(
    c => c.type === "string" && c.uniqueCount <= 50
  )
  if (stringCol) return stringCol

  const firstNonNumeric = columns.find(c => !c.isNumeric)
  if (firstNonNumeric) return firstNonNumeric

  return null
}

/**
 * Select best column for y-axis
 */
export function selectYAxisColumn(
  columns: DetectedColumn[]
): DetectedColumn | null {
  // Priority: value keyword → numeric
  const valueKeywordCol = columns.find(c => c.hasValueKeywords && c.isNumeric)
  if (valueKeywordCol) return valueKeywordCol

  const numericCol = columns.find(c => c.isNumeric)
  if (numericCol) return numericCol

  return null
}

/**
 * Detect axis type from column data
 */
export function detectAxisType(data: SQLQueryResult, column: string): AxisType {
  const columns = analyzeColumns(data)
  const colInfo = columns.find(c => c.name === column)

  if (!colInfo) return "category"

  if (colInfo.type === "numeric") return "number"
  if (colInfo.type === "date" || colInfo.hasDateKeywords) return "time"

  return "category"
}

/**
 * Detect appropriate aggregation type
 */
export function detectAggregation(
  data: SQLQueryResult,
  xColumn: string,
  chartType: ChartType
): AggregationType {
  if (chartType === "pie") {
    // Pie charts need aggregation
    return "sum"
  }

  // Check if x-axis has duplicates
  const uniqueXCount = new Set(data.rows.map(r => r[xColumn])).size

  if (uniqueXCount === data.rowCount) {
    // No duplicates, no aggregation needed
    return "none"
  }

  // Has duplicates, need aggregation
  return "sum"
}

/**
 * Detect appropriate sort order
 */
export function detectSort(
  chartType: ChartType,
  xAxisType: AxisType
): SortType {
  if (chartType === "pie") {
    return "desc" // Pie charts always descending
  }

  if (xAxisType === "time") {
    return "asc" // Time always ascending
  }

  return "none" // Keep original order for categories
}
