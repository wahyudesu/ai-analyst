/**
 * Main chart generation tool
 * Creates visualization specifications from SQL query results
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type {
  ChartType,
  AxisType,
  AggregationType,
  SortType,
  ColorScheme,
  GenerateChartOutput,
} from './types.js';
import { processXYChart, processPieChart, countDataPoints } from './data-processors.js';
import { getPalette } from './color-palettes.js';

// Chart type enum
const chartTypes = ['bar', 'line', 'area', 'pie'] as const;

// Axis type enum
const axisTypes = ['category', 'time', 'number'] as const;

// Aggregation type enum
const aggregationTypes = ['none', 'sum', 'avg', 'count', 'min', 'max'] as const;

// Sort type enum
const sortTypes = ['asc', 'desc', 'none'] as const;

// Color scheme enum
const colorSchemes = ['default', 'categorical', 'sequential'] as const;

// SQL Query Result Schema
const SQLQueryResultSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.any()),
  rowCount: z.number(),
  executionTime: z.number().optional(),
});

// X-axis config schema
const XAxisConfigSchema = z.object({
  column: z.string().describe('Column name from data.columns'),
  label: z.string().optional().describe('Custom label for the axis'),
  type: z.enum(axisTypes).optional().describe('Axis type: category, time, or number'),
  dateFormat: z.string().optional().describe('Date format for time axis'),
});

// Y-axis config schema
const YAxisConfigSchema = z.object({
  column: z.string().describe('Column name from data.columns'),
  label: z.string().optional().describe('Custom label for the series'),
  color: z.string().optional().describe('Color hex code (e.g. #3b82f6)'),
  aggregation: z.enum(aggregationTypes).optional().describe('Aggregation method for grouped data'),
});

// Chart options schema
const ChartOptionsSchema = z.object({
  legend: z.boolean().optional().describe('Show legend'),
  stacked: z.boolean().optional().describe('Stack series (for bar/area charts)'),
  horizontal: z.boolean().optional().describe('Horizontal orientation (for bar charts)'),
  showDataLabels: z.boolean().optional().describe('Show data labels on chart'),
  sort: z.enum(sortTypes).optional().describe('Sort order: asc, desc, or none'),
  limit: z.number().optional().describe('Maximum number of data points to display'),
});

/**
 * Generate Chart Tool
 * Creates chart configurations from SQL query results for frontend rendering
 */
export const generateChartTool = createTool({
  id: 'generate-chart',
  description: `Generate chart configurations from SQL query results.
Creates visualization specifications for frontend rendering using Recharts.

Choose appropriate chart types based on data:
- bar: Comparisons across categories (e.g., "sales by month", "top products")
- line: Trends over time with continuous data (e.g., "stock prices over time")
- area: Trends showing volume/magnitude over time (e.g., "website traffic over time")
- pie: Proportions of a whole (max 5-7 categories, e.g., "sales by category")

The tool processes the SQL query result and returns a structured configuration
that can be rendered by the frontend ChartRenderer component.`,
  inputSchema: z.object({
    // Data source
    data: SQLQueryResultSchema.describe('SQL query result from execute-sql tool'),

    // Chart configuration
    chartType: z
      .enum(chartTypes)
      .describe('Type of chart: bar, line, area, or pie'),

    // X-axis configuration
    xAxis: XAxisConfigSchema
      .optional()
      .describe('X-axis configuration (required for bar/line/area, optional for pie)'),

    // Y-axis / Series configuration
    yAxis: z
      .array(YAxisConfigSchema)
      .min(1)
      .describe('Array of Y-axis/series configurations with column name, optional label, color, and aggregation'),

    // Metadata
    title: z.string().describe('Chart title'),
    subtitle: z.string().optional().describe('Chart subtitle'),

    // Display options
    options: ChartOptionsSchema.optional().describe('Display options for the chart'),

    // Color scheme
    colorScheme: z
      .enum(colorSchemes)
      .optional()
      .describe('Color scheme: default, categorical, or sequential'),
    primaryColor: z
      .string()
      .optional()
      .describe('Primary color hex code (e.g. #3b82f6)'),
  }),
  execute: async ({
    data,
    chartType,
    xAxis,
    yAxis,
    title,
    subtitle,
    options = {},
    colorScheme = 'default',
    primaryColor,
  }): Promise<GenerateChartOutput> => {
    const { columns, rows, rowCount } = data;

    // Validate column names exist in data
    for (const series of yAxis) {
      if (!columns.includes(series.column)) {
        throw new Error(
          `Column "${series.column}" not found in data. Available columns: ${columns.join(', ')}`
        );
      }
    }

    if (xAxis && !columns.includes(xAxis.column)) {
      throw new Error(
        `Column "${xAxis.column}" not found in data. Available columns: ${columns.join(', ')}`
      );
    }

    // Process data based on chart type
    let processedData: GenerateChartOutput['data'];

    if (chartType === 'pie') {
      processedData = {
        slices: processPieChart(data, yAxis, options),
      };
    } else {
      // bar, line, area require xAxis
      if (!xAxis) {
        throw new Error(`xAxis is required for ${chartType} charts`);
      }
      processedData = {
        series: processXYChart(data, chartType, xAxis, yAxis, options),
      };
    }

    // Build output
    const result: GenerateChartOutput = {
      chartType,
      title,
      subtitle,
      data: processedData,
      options: {
        legend: options.legend ?? true,
        stacked: options.stacked ?? false,
        horizontal: options.horizontal ?? false,
        showDataLabels: options.showDataLabels ?? false,
      },
      colors: {
        palette: getPalette(colorScheme),
        primary: primaryColor,
      },
      metadata: {
        dataSourceRowCount: rowCount,
        displayedPointCount: countDataPoints(processedData.series, processedData.slices),
        generatedAt: new Date().toISOString(),
      },
    };

    // Add axis info for non-pie charts
    if (chartType !== 'pie' && xAxis) {
      result.xAxis = {
        label: xAxis.label || xAxis.column,
        type: xAxis.type || 'category',
        dateFormat: xAxis.dateFormat,
      };
      result.yAxis = yAxis.map((y) => ({
        label: y.label || y.column,
      }));
    }

    return result;
  },
});
