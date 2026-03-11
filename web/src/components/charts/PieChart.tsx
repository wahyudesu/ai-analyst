'use client';

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { getChartColor } from './colors';
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
        <div className={`flex items-center justify-center h-64 text-muted-foreground ${className || ''}`}>
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
              label={({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) => {
                const RADIAN = Math.PI / 180;
                const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
                const x = cx + radius * Math.cos(-(midAngle ?? 0) * RADIAN);
                const y = cy + radius * Math.sin(-(midAngle ?? 0) * RADIAN);
                const percent = total > 0 ? ((value || 0) / total * 100).toFixed(1) : '0';
                const labelText = options.showDataLabels ? `${name}: ${percent}%` : name;
                return (
                    <text
                      x={x}
                      y={y}
                      className="text-foreground text-[10px]"
                      fill="currentColor"
                      textAnchor={x > cx ? 'start' : 'end'}
                      dominantBaseline="central"
                    >
                      {labelText}
                    </text>
                );
              }}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
            {slices.map((slice, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getChartColor(index)}
              />
            ))}
          </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                color: 'var(--popover-foreground)',
              }}
              itemStyle={{ color: 'var(--foreground)' }}
              labelStyle={{ color: 'var(--muted-foreground)' }}
              formatter={(value?: number) => {
              if (value === undefined) return ['', ''];
              const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
              return [`${value} (${percent}%)`, ''];
            }}
          />
            {options.legend && <Legend wrapperStyle={{ color: 'var(--foreground)' }} />}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
