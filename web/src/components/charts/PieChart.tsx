'use client';

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type { ChartConfig as LegacyChartConfig } from './types';

interface PieChartProps {
  config: LegacyChartConfig;
  className?: string;
  skipAnimation?: boolean;
}

interface PieDataItem {
  name: string;
  value: number;
  fill?: string;
}

/**
 * Pie chart component using Recharts with shadcn/ui pattern
 */
export function PieChart({ config, className, skipAnimation }: PieChartProps) {
  const { data, colors, options } = config;
  const slices = data.slices || [];

  if (slices.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 text-muted-foreground ${className || ''}`}>
        No data available
      </div>
    );
  }

  // Prepare data for Recharts with fill colors
  const chartData: PieDataItem[] = slices.map((slice, index) => ({
    name: slice.name,
    value: slice.value,
    fill: slice.color || colors?.palette?.[index] || `var(--chart-${(index % 5) + 1})`,
  }));

  // Calculate total for percentage
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  // Build shadcn chart config from slices
  const shadcnConfig: ChartConfig = slices.reduce((acc, slice, idx) => {
    acc[slice.name] = {
      label: slice.name,
      color: slice.color || colors?.palette?.[idx] || `var(--chart-${(idx % 5) + 1})`,
    };
    return acc;
  }, {} as ChartConfig);

  return (
    <ChartContainer config={shadcnConfig} className={className}>
      <RechartsPieChart margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          labelLine={false}
          label={options.showDataLabels ? ({ name, value }) => {
            const percent = total > 0 ? ((value || 0) / total * 100).toFixed(1) : '0';
            return `${percent}%`;
          } : false}
          outerRadius={70}
          dataKey="value"
          animationDuration={skipAnimation ? 0 : 500}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip
          content={<ChartTooltipContent />}
        />
        {options.legend && (
          <ChartLegend
            content={<ChartLegendContent />}
            verticalAlign="bottom"
            align="center"
          />
        )}
      </RechartsPieChart>
    </ChartContainer>
  );
}
