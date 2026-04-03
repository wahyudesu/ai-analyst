'use client';

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
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

interface AreaChartProps {
  config: LegacyChartConfig;
  className?: string;
  skipAnimation?: boolean;
}

// Format date strings to readable format
function formatXLabel(value: string): string {
  // Check if it's an ISO date string
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(date);
    }
  }
  return value;
}

/**
 * Area chart component using Recharts with shadcn/ui pattern
 * Supports multiple series for showing magnitude over time
 */
export function AreaChart({ config, className, skipAnimation }: AreaChartProps) {
  const { data, options, colors } = config;
  const series = data.series || [];

  if (series.length === 0 || !series[0]?.data?.length) {
    return (
      <div className={`flex items-center justify-center h-64 text-muted-foreground ${className || ''}`}>
        No data available
      </div>
    );
  }

  // Build shadcn chart config from legacy config
  // Use sanitized keys (no spaces) for CSS variables
  const sanitizedKeys = series.map((s, idx) => ({
    original: s.name,
    sanitized: s.name.replace(/\s+/g, '-').toLowerCase(),
    color: colors?.palette?.[idx] || s.color || `var(--chart-${(idx % 5) + 1})`,
  }));

  const shadcnConfig: ChartConfig = sanitizedKeys.reduce((acc, item) => {
    acc[item.sanitized] = {
      label: item.original,
      color: item.color,
    };
    return acc;
  }, {} as ChartConfig);

  // Prepare data for Recharts with sanitized keys
  const chartData = series[0].data.map((point, index) => {
    const row: Record<string, unknown> = {
      _x: point.x,
      _label: point.label,
    };

    series.forEach((s, idx) => {
      if (s.data[index]) {
        row[sanitizedKeys[idx].sanitized] = s.data[index].y;
      }
    });

    return row;
  });

  return (
    <ChartContainer config={shadcnConfig} className={className}>
      <RechartsAreaChart
        data={chartData}
        margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="_x"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => formatXLabel(String(value))}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) =>
            typeof value === 'number' ? value.toLocaleString() : String(value)
          }
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {options.legend && <ChartLegend content={<ChartLegendContent />} />}
        {sanitizedKeys.map((item) => (
          <Area
            key={item.original}
            type="monotone"
            dataKey={item.sanitized}
            name={item.original}
            fill={`var(--color-${item.sanitized})`}
            stroke={`var(--color-${item.sanitized})`}
            fillOpacity={0.6}
            strokeWidth={2}
            stackId={options.stacked ? 'stack' : undefined}
            animationDuration={skipAnimation ? 0 : 500}
          />
        ))}
      </RechartsAreaChart>
    </ChartContainer>
  );
}
