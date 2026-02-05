'use client';

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import type { ChartConfig } from './types';

interface PieChartProps {
  config: ChartConfig;
  className?: string;
}

interface PieDataItem {
  name: string;
  value: number;
  percentage?: number;
}

/**
 * Pie chart component using Recharts
 * Shows proportions of a whole with customizable slices
 */
export function PieChart({ config, className }: PieChartProps) {
  const { data, colors, options } = config;
  const slices = data.slices || [];

  if (slices.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 text-zinc-500 ${className || ''}`}>
        No data available
      </div>
    );
  }

  // Prepare data for Recharts
  const chartData: PieDataItem[] = slices.map((slice) => ({
    name: slice.name,
    value: slice.value,
    percentage: slice.percentage,
  }));

  // Calculate total for percentage
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsPieChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => {
              if (options.showDataLabels) {
                const percent = total > 0 ? ((entry.value || 0) / total * 100).toFixed(1) : '0';
                return `${entry.name}: ${percent}%`;
              }
              return entry.name;
            }}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {slices.map((slice, index) => (
              <Cell
                key={`cell-${index}`}
                fill={slice.color || colors.palette[index % colors.palette.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
            itemStyle={{ color: '#18181b' }}
            labelStyle={{ color: '#71717a' }}
            formatter={(value?: number) => {
              if (value === undefined) return ['', ''];
              const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
              return [`${value} (${percent}%)`, ''];
            }}
          />
          {options.legend && <Legend />}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
