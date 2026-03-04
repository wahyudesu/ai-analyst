'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getChartColor } from './colors';
import type { ChartConfig } from './types';

interface DualAxisChartProps {
  config: ChartConfig;
  className?: string;
  leftAxisLabel?: string;
  rightAxisLabel?: string;
}

/**
 * Dual axis chart combining bars and lines
 * Useful for showing signups (bars) with activation rate (line)
 */
export function DualAxisChart({
  config,
  className,
  leftAxisLabel = '',
  rightAxisLabel = '',
}: DualAxisChartProps) {
  const { data, xAxis, yAxis, options, colors } = config;
  const series = data.series || [];

    if (series.length === 0 || !series[0]?.data?.length) {
      return (
          <div className={`flex items-center justify-center h-64 text-muted-foreground ${className || ''}`}>
          No data available
        </div>
      );
    }

  // Prepare data for Recharts
  const chartData = series[0].data.map((point, index) => {
    const row: Record<string, unknown> = {
      _x: point.x,
      _label: point.label,
    };

    series.forEach((s) => {
      if (s.data[index]) {
        row[s.name] = s.data[index].y;
      }
    });

    return row;
  });

  // First series is bars, second is line
  const barSeries = series[0];
  const lineSeries = series[1];

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="_x"
              stroke="var(--muted-foreground)"
              className="text-xs"
              tick={{ fill: 'currentColor', className: 'text-muted-foreground text-[10px]' }}
              tickLine={{ stroke: 'var(--muted-foreground)' }}
            />
            <YAxis
              yAxisId="left"
              stroke="var(--muted-foreground)"
              className="text-xs"
              tick={{ fill: 'currentColor', className: 'text-muted-foreground text-[10px]' }}
              tickLine={{ stroke: 'var(--muted-foreground)' }}
              label={{ value: leftAxisLabel, angle: -90, position: 'insideLeft', className: 'fill-muted-foreground text-[10px]' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="var(--muted-foreground)"
              className="text-xs"
              tick={{ fill: 'currentColor', className: 'text-muted-foreground text-[10px]' }}
              tickLine={{ stroke: 'var(--muted-foreground)' }}
              label={{ value: rightAxisLabel, angle: 90, position: 'insideRight', className: 'fill-muted-foreground text-[10px]' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                color: 'var(--popover-foreground)',
              }}
              itemStyle={{ color: 'var(--foreground)' }}
              labelStyle={{ color: 'var(--muted-foreground)' }}
            />
            {options.legend && <Legend wrapperStyle={{ color: 'var(--foreground)' }} />}
          {barSeries && (
            <Bar
              yAxisId="left"
              dataKey={barSeries.name}
              name={barSeries.name}
              fill={getChartColor(0)}
            />
          )}
          {lineSeries && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey={lineSeries.name}
              name={lineSeries.name}
              stroke={getChartColor(1)}
              strokeWidth={2}
              dot={{ fill: getChartColor(1) }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
