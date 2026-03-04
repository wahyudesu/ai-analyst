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

interface StackedAreaChartProps {
  config: ChartConfig;
  className?: string;
}

/**
 * Stacked area chart component for showing multiple data series stacked
 */
export function StackedAreaChart({ config, className }: StackedAreaChartProps) {
  const { data, xAxis, yAxis, options, colors } = config;
  const series = data.series || [];

  if (series.length === 0 || !series[0]?.data?.length) {
    return (
      <div className={`flex items-center justify-center h-64 text-zinc-500 ${className || ''}`}>
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
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-zinc-800" />
          <XAxis
            dataKey="_x"
            stroke="#71717a"
            className="text-xs"
            tick={{ fill: '#71717a' }}
            tickLine={{ stroke: '#71717a' }}
          />
          <YAxis
            stroke="#71717a"
            className="text-xs"
            tick={{ fill: '#71717a' }}
            tickLine={{ stroke: '#71717a' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
            itemStyle={{ color: '#18181b' }}
            labelStyle={{ color: '#71717a' }}
          />
          {options.legend && <Legend />}
          {series.map((s, seriesIndex) => (
            <Area
              key={s.name}
              type="monotone"
              dataKey={s.name}
              name={s.name}
              stackId="stack"
              stroke={getChartColor(seriesIndex)}
              fill={getChartColor(seriesIndex)}
              fillOpacity={0.6}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
