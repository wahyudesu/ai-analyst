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

interface StackedAreaChartProps {
  config: LegacyChartConfig;
  className?: string;
}

/**
 * Stacked area chart component using Recharts with shadcn/ui pattern
 */
export function StackedAreaChart({ config, className }: StackedAreaChartProps) {
  const { data, options, colors } = config;
  const series = data.series || [];

  if (series.length === 0 || !series[0]?.data?.length) {
    return (
      <div className={`flex items-center justify-center h-64 text-muted-foreground ${className || ''}`}>
        No data available
      </div>
    );
  }

  // Build shadcn chart config from legacy config with sanitized keys
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
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="_x"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
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
            stackId="stack"
          />
        ))}
      </RechartsAreaChart>
    </ChartContainer>
  );
}
