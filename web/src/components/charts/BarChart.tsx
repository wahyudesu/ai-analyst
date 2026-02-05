'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ChartConfig } from './types';

interface BarChartProps {
  config: ChartConfig;
  className?: string;
}

/**
 * Bar chart component using Recharts
 * Supports horizontal/vertical, stacked, and multiple series
 */
export function BarChart({ config, className }: BarChartProps) {
  const { data, xAxis, yAxis, options, colors } = config;
  const series = data.series || [];

  if (series.length === 0) {
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

  const isHorizontal = options.horizontal;

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBarChart
          data={chartData}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-zinc-800" />
          <XAxis
            dataKey={isHorizontal ? undefined : '_x'}
            type={isHorizontal ? 'number' : undefined}
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
            <Bar
              key={s.name}
              dataKey={s.name}
              name={s.name}
              fill={s.color || colors.palette[seriesIndex % colors.palette.length]}
              stackId={options.stacked ? 'stack' : undefined}
            >
              {seriesIndex === 0 &&
                chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={s.color || colors.palette[index % colors.palette.length]}
                  />
                ))}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
