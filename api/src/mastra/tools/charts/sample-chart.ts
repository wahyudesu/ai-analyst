/**
 * Sample Chart Tool - Generates chart with mock data
 * Use this for testing/preview without needing actual database data
 */

import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import type { GenerateChartOutput } from "./types.js"

const sampleData = {
  // Sales by month
  monthlySales: {
    columns: ["month", "sales"],
    rows: [
      { month: "Jan", sales: 150000 },
      { month: "Feb", sales: 180000 },
      { month: "Mar", sales: 220000 },
      { month: "Apr", sales: 195000 },
      { month: "May", sales: 250000 },
      { month: "Jun", sales: 280000 },
    ],
    rowCount: 6,
  },
  // Category distribution
  categorySales: {
    columns: ["category", "amount"],
    rows: [
      { category: "Electronics", amount: 450000 },
      { category: "Clothing", amount: 320000 },
      { category: "Food", amount: 280000 },
      { category: "Home", amount: 150000 },
      { category: "Others", amount: 70000 },
    ],
    rowCount: 5,
  },
  // Revenue vs Cost trend
  revenueCost: {
    columns: ["month", "revenue", "cost"],
    rows: [
      { month: "Jan", revenue: 500000, cost: 300000 },
      { month: "Feb", revenue: 550000, cost: 350000 },
      { month: "Mar", revenue: 480000, cost: 320000 },
      { month: "Apr", revenue: 620000, cost: 380000 },
      { month: "May", revenue: 700000, cost: 400000 },
    ],
    rowCount: 5,
  },
}

/**
 * Sample Chart Tool
 * Generates ready-to-display chart with mock data for testing
 */
export const sampleChartTool = createTool({
  id: "sample-chart",
  description: `Generate a sample chart with mock data for testing/preview.

Available chart types:
- bar: Sales by month (categorical comparison)
- pie: Sales by category (proportion distribution)
- line: Revenue vs Cost trend (multi-series time series)
- area: Cumulative growth over time

Use this when user wants to see a demo chart or test the visualization without real data.`,
  inputSchema: z.object({
    chartType: z.enum(["bar", "line", "area", "pie"]).describe("Type of chart to generate"),
    dataType: z
      .enum(["monthlySales", "categorySales", "revenueCost"])
      .optional()
      .describe("Which sample dataset to use (auto-selected based on chartType if not specified)"),
    title: z.string().optional().describe("Chart title (auto-generated if not specified)"),
  }),
  execute: async ({ chartType, dataType, title }): Promise<GenerateChartOutput> => {
    // Auto-select data based on chart type
    let selectedData = dataType ? sampleData[dataType as keyof typeof sampleData] : null
    let finalTitle = title

    if (!selectedData) {
      switch (chartType) {
        case "bar":
          selectedData = sampleData.monthlySales
          finalTitle ||= "Monthly Sales"
          break
        case "pie":
          selectedData = sampleData.categorySales
          finalTitle ||= "Sales by Category"
          break
        case "line":
          selectedData = sampleData.revenueCost
          finalTitle ||= "Revenue vs Cost Trend"
          break
        case "area":
          selectedData = sampleData.monthlySales
          finalTitle ||= "Sales Growth"
          break
      }
    }

    if (!selectedData) {
      throw new Error("No data available for the requested chart type")
    }

    finalTitle ||= "Sample Chart"

    // Build chart output based on type
    if (chartType === "pie") {
      return {
        chartType: "pie",
        title: finalTitle,
        data: {
          slices: selectedData.rows.map((row: any) => ({
            name: row.category || row.month,
            value: row.amount || row.sales,
            color: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][selectedData.rows.indexOf(row)],
            percentage: Math.round(((row.amount || row.sales) / selectedData.rows.reduce((sum: number, r: any) => sum + (r.amount || r.sales), 0)) * 1000) / 10,
          })),
        },
        options: {
          legend: true,
          stacked: false,
          horizontal: false,
          showDataLabels: false,
        },
        colors: {
          palette: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
        },
        metadata: {
          dataSourceRowCount: selectedData.rowCount,
          displayedPointCount: selectedData.rows.length,
          generatedAt: new Date().toISOString(),
        },
      }
    }

    // For bar/line/area
    const isMultiSeries = selectedData.columns.length > 2
    const valueColumns = selectedData.columns.slice(1)

    return {
      chartType,
      title: finalTitle,
      data: {
        series: valueColumns.map((col) => ({
          name: col,
          data: selectedData.rows.map((row: any) => ({
            x: row.month || row.category,
            y: row[col],
            label: `${row.month || row.category}: ${row[col]}`,
          })),
          color: col === "revenue" ? "#3b82f6" : col === "cost" ? "#ef4444" : "#10b981",
        })),
      },
      xAxis: {
        label: selectedData.columns[0],
        type: "category",
      },
      yAxis: valueColumns.map((col) => ({ label: col })),
      options: {
        legend: isMultiSeries,
        stacked: false,
        horizontal: false,
        showDataLabels: false,
      },
      colors: {
        palette: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
      },
      metadata: {
        dataSourceRowCount: selectedData.rowCount,
        displayedPointCount: selectedData.rows.length * valueColumns.length,
        generatedAt: new Date().toISOString(),
      },
    }
  },
})
