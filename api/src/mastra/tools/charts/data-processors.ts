/**
 * Data transformation utilities for chart generation
 */

import type {
  SQLQueryResult,
  XAxisConfig,
  YAxisConfig,
  ChartType,
  ChartOptions,
  DataPoint,
  Series,
  PieSlice,
  AggregationType,
  SortType,
} from './types.js';
import { getColor, getPalette } from './color-palettes.js';

/**
 * Get column value from row
 */
function getColumnValue(row: Record<string, unknown>, column: string): unknown {
  return row[column];
}

/**
 * Check if value is numeric
 */
function isNumeric(value: unknown): boolean {
  if (typeof value === 'number') {
    return !isNaN(value) && isFinite(value);
  }
  if (typeof value === 'string') {
    return !isNaN(Number(value)) && value.trim() !== '';
  }
  return false;
}

/**
 * Convert value to number
 */
function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return Number(value);
  }
  return 0;
}

/**
 * Convert value to string
 */
function toString(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/**
 * Apply aggregation to values
 */
function applyAggregation(values: number[], aggregation: AggregationType): number {
  if (values.length === 0) return 0;

  switch (aggregation) {
    case 'sum':
      return values.reduce((sum, val) => sum + val, 0);
    case 'avg':
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    case 'count':
      return values.length;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'none':
    default:
      return values[values.length - 1] || 0;
  }
}

/**
 * Group data by x-axis values
 */
function groupByXAxis(
  rows: Record<string, unknown>[],
  xColumn: string,
  yColumn: string,
  aggregation: AggregationType = 'none'
): Map<string | number, number> {
  const groups = new Map<string | number, number[]>();

  for (const row of rows) {
    const xValue = getColumnValue(row, xColumn);
    const yValue = getColumnValue(row, yColumn);

    if (!isNumeric(yValue)) continue;

    const key = typeof xValue === 'number' ? xValue : toString(xValue);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)!.push(toNumber(yValue));
  }

  // Apply aggregation
  const result = new Map<string | number, number>();
  for (const [key, values] of groups.entries()) {
    result.set(key, applyAggregation(values, aggregation));
  }

  return result;
}

/**
 * Sort data points
 */
function sortDataPoints(
  data: DataPoint[],
  sortType: SortType,
  xType: 'category' | 'time' | 'number'
): DataPoint[] {
  if (sortType === 'none') {
    return data;
  }

  const sorted = [...data];

  sorted.sort((a, b) => {
    const aVal = a.x;
    const bVal = b.x;

    // For time/category, sort by labels
    if (xType === 'time' || xType === 'category') {
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortType === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    }

    // For numeric, sort by values
    const aNum = Number(aVal) || 0;
    const bNum = Number(bVal) || 0;
    return sortType === 'asc' ? aNum - bNum : bNum - aNum;
  });

  return sorted;
}

/**
 * Limit data points
 */
function limitDataPoints(data: DataPoint[], limit?: number): DataPoint[] {
  if (!limit || limit >= data.length) {
    return data;
  }
  return data.slice(0, limit);
}

/**
 * Process data for bar/line/area charts
 */
export function processXYChart(
  data: SQLQueryResult,
  chartType: ChartType,
  xAxis: XAxisConfig,
  yAxis: YAxisConfig[],
  options?: ChartOptions
): Series[] {
  const { rows, columns } = data;
  const xColumn = xAxis.column;
  const xType = xAxis.type || 'category';
  const sort = options?.sort || 'none';
  const limit = options?.limit;

  // Validate columns exist
  if (!columns.includes(xColumn)) {
    throw new Error(`X-axis column "${xColumn}" not found in data`);
  }

  const series: Series[] = [];

  for (const yConfig of yAxis) {
    const yColumn = yConfig.column;
    const label = yConfig.label || yColumn;
    const aggregation = yConfig.aggregation || 'none';
    const color = yConfig.color;

    if (!columns.includes(yColumn)) {
      throw new Error(`Y-axis column "${yColumn}" not found in data`);
    }

    // Group data by x-axis
    const grouped = groupByXAxis(rows, xColumn, yColumn, aggregation);

    // Convert to data points
    const dataPoints: DataPoint[] = [];
    for (const [xValue, yValue] of grouped.entries()) {
      dataPoints.push({
        x: xValue,
        y: yValue,
        label: `${xValue}: ${yValue}`,
      });
    }

    // Sort and limit
    const processed = limitDataPoints(
      sortDataPoints(dataPoints, sort, xType),
      limit
    );

    series.push({
      name: label,
      data: processed,
      color: color || getColor(series.length, 'categorical'),
    });
  }

  return series;
}

/**
 * Process data for pie charts
 */
export function processPieChart(
  data: SQLQueryResult,
  yAxis: YAxisConfig[],
  options?: ChartOptions
): PieSlice[] {
  const { rows, columns } = data;
  const sort = options?.sort || 'desc';
  const limit = options?.limit || 7; // Default 7 slices max

  // For pie charts, use first y-series as values
  const yConfig = yAxis[0];
  const yColumn = yConfig.column;
  const aggregation = yConfig.aggregation || 'none';

  if (!columns.includes(yColumn)) {
    throw new Error(`Column "${yColumn}" not found in data`);
  }

  // Find label column (use first non-y column or 'label' if exists)
  let labelColumn = columns.find((c) => c !== yColumn && c.toLowerCase().includes('label'));
  if (!labelColumn) {
    labelColumn = columns.find((c) => c !== yColumn && c.toLowerCase().includes('name'));
  }
  if (!labelColumn) {
    labelColumn = columns.find((c) => c !== yColumn);
  }
  if (!labelColumn) {
    labelColumn = yColumn;
  }

  // Group by label column
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    const labelValue = toString(getColumnValue(row, labelColumn));
    const yValue = getColumnValue(row, yColumn);

    if (!isNumeric(yValue)) continue;

    if (!groups.has(labelValue)) {
      groups.set(labelValue, []);
    }

    groups.get(labelValue)!.push(toNumber(yValue));
  }

  // Apply aggregation and create slices
  const slices: PieSlice[] = [];
  const palette = getPalette('categorical');
  let total = 0;

  const groupedSlices: Array<{ name: string; value: number }> = [];

  for (const [name, values] of groups.entries()) {
    const value = applyAggregation(values, aggregation);
    groupedSlices.push({ name, value });
    total += value;
  }

  // Sort by value
  groupedSlices.sort((a, b) => {
    return sort === 'asc' ? a.value - b.value : b.value - a.value;
  });

  // Create slices with colors and percentages
  for (let i = 0; i < Math.min(groupedSlices.length, limit); i++) {
    const { name, value } = groupedSlices[i];
    slices.push({
      name,
      value,
      color: palette[i % palette.length],
      percentage: total > 0 ? Math.round((value / total) * 1000) / 10 : 0,
    });
  }

  return slices;
}

/**
 * Count total data points across all series
 */
export function countDataPoints(series?: Series[], slices?: PieSlice[]): number {
  if (series) {
    return series.reduce((sum, s) => sum + s.data.length, 0);
  }
  if (slices) {
    return slices.length;
  }
  return 0;
}
