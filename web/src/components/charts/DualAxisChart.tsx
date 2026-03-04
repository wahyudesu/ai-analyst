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
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-zinc-800" />
          <XAxis
            dataKey="_x"
            stroke="#71717a"
            className="text-xs"
            tick={{ fill: '#71717a' }}
            tickLine={{ stroke: '#71717a' }}
          />
          <YAxis
            yAxisId="left"
            stroke="#71717a"
            className="text-xs"
            tick={{ fill: '#71717a' }}
            tickLine={{ stroke: '#71717a' }}
            label={{ value: leftAxisLabel, angle: -90, position: 'insideLeft' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#71717a"
            className="text-xs"
            tick={{ fill: '#71717a' }}
            tickLine={{ stroke: '#71717a' }}
            label={{ value: rightAxisLabel, angle: 90, position: 'insideRight' }}
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
