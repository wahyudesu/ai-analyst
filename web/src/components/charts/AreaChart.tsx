'use client';

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getChartColor } from './colors';
import type { ChartConfig } from './types';

interface AreaChartProps {
  config: ChartConfig;
  className?: string;
}

// Format date strings to readable format
function formatXLabel(value: string): string {
  // Check if it's an ISO date string
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const day = date.getDate();
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      return `${month} ${day}`;
    }
  }
  return value;
}

/**
 * Area chart component using Recharts
 * Supports multiple series for showing magnitude over time
 */
export function AreaChart({ config, className }: AreaChartProps) {
  const { data, options, colors } = config;
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

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsAreaChart
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
                  tickFormatter={(value) => formatXLabel(String(value))}
                />
              <YAxis
                stroke="var(--muted-foreground)"
                className="text-xs"
                tick={{ fill: 'currentColor', className: 'text-muted-foreground text-[10px]' }}
                tickLine={{ stroke: 'var(--muted-foreground)' }}
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
          {series.map((s, seriesIndex) => (
            <Area
              key={s.name}
              type="monotone"
              dataKey={s.name}
              name={s.name}
              stroke={getChartColor(seriesIndex)}
              fill={getChartColor(seriesIndex)}
              fillOpacity={0.6}
              strokeWidth={2}
              stackId={options.stacked ? 'stack' : undefined}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
