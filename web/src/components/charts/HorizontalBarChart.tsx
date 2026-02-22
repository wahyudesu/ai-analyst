'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ChartConfig } from './types';

interface HorizontalBarChartProps {
  config: ChartConfig;
  className?: string;
}

/**
 * Horizontal bar chart component for funnel charts and rankings
 */
export function HorizontalBarChart({ config, className }: HorizontalBarChartProps) {
  const { data, xAxis, options, colors } = config;
  const series = data.series || [];

  if (series.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 text-zinc-500 ${className || ''}`}>
        No data available
      </div>
    );
  }

  const chartData = series[0].data.map((point) => ({
    name: point.label || String(point.x),
    value: point.y,
  }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-zinc-800" />
          <XAxis
            type="number"
            stroke="#71717a"
            className="text-xs"
            tick={{ fill: '#71717a' }}
            tickLine={{ stroke: '#71717a' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#71717a"
            className="text-xs"
            tick={{ fill: '#71717a' }}
            tickLine={{ stroke: '#71717a' }}
            width={55}
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
          <Bar dataKey="value">
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors.palette[index % colors.palette.length]}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
