/**
 * Chart types for frontend components
 * These match the backend GenerateChartOutput schema
 */

export type ChartType = 'bar' | 'line' | 'area' | 'pie';
export type AxisType = 'category' | 'time' | 'number';

export interface DataPoint {
  x: string | number;
  y: number;
  label?: string;
}

export interface Series {
  name: string;
  data: DataPoint[];
  color?: string;
}

export interface PieSlice {
  name: string;
  value: number;
  color?: string;
  percentage?: number;
}

export interface ProcessedData {
  series?: Series[];
  slices?: PieSlice[];
}

export interface OutputXAxis {
  label: string;
  type: AxisType;
  dateFormat?: string;
}

export interface OutputYAxis {
  label: string;
}

export interface OutputOptions {
  legend: boolean;
  stacked: boolean;
  horizontal: boolean;
  showDataLabels: boolean;
}

export interface ColorConfig {
  palette: string[];
  primary?: string;
}

export interface ChartMetadata {
  dataSourceRowCount: number;
  displayedPointCount: number;
  generatedAt: string;
}

export interface ChartConfig {
  chartType: ChartType;
  title: string;
  subtitle?: string;
  data: ProcessedData;
  xAxis?: OutputXAxis;
  yAxis?: OutputYAxis[];
  options: OutputOptions;
  colors: ColorConfig;
  metadata: ChartMetadata;
}
