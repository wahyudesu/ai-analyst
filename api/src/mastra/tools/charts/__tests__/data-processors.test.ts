/**
 * Tests for data processors - Critical tests only
 */

import { describe, expect, it } from "vitest"
import {
  countDataPoints,
  processPieChart,
  processXYChart,
} from "../data-processors.js"
import type {
  ChartOptions,
  SQLQueryResult,
  XAxisConfig,
  YAxisConfig,
} from "../types.js"

describe("Data Processors", () => {
  const mockData: SQLQueryResult = {
    columns: ["category", "value"],
    rows: [
      { category: "A", value: 100 },
      { category: "B", value: 200 },
    ],
    rowCount: 2,
  }

  it("should process bar chart", () => {
    const xAxis: XAxisConfig = { column: "category", type: "category" }
    const yAxis: YAxisConfig[] = [{ column: "value" }]
    const options: ChartOptions = {
      legend: true,
      stacked: false,
      horizontal: false,
      showDataLabels: false,
    }

    const result = processXYChart(mockData, "bar", xAxis, yAxis, options)
    expect(result).toHaveLength(1)
    expect(result[0].data).toHaveLength(2)
  })

  it("should process pie chart", () => {
    const yAxis: YAxisConfig[] = [{ column: "value" }]
    const options: ChartOptions = {
      legend: true,
      stacked: false,
      horizontal: false,
      showDataLabels: false,
      limit: 7,
      sort: "desc",
    }

    const result = processPieChart(mockData, yAxis, options)
    expect(result).toHaveLength(2)
    expect(result[0].percentage).toBeGreaterThan(0)
  })

  it("should count data points", () => {
    const series = [
      { name: "A", data: [{ x: 1, y: 10, label: "1:10" }], color: "#ff0000" },
    ]
    expect(countDataPoints(series, undefined)).toBe(1)
  })

  it("should throw on invalid column", () => {
    const xAxis: XAxisConfig = { column: "invalid", type: "category" }
    const yAxis: YAxisConfig[] = [{ column: "value" }]
    const options: ChartOptions = {
      legend: true,
      stacked: false,
      horizontal: false,
      showDataLabels: false,
    }

    expect(() =>
      processXYChart(mockData, "bar", xAxis, yAxis, options)
    ).toThrow()
  })
})
