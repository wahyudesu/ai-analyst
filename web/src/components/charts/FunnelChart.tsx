'use client';

import { getChartColor } from './colors';
import type { ChartConfig } from './types';

interface FunnelChartProps {
  config: ChartConfig;
  className?: string;
}

interface FunnelStep {
  name: string;
  value: number;
  percentage?: number;
  color?: string;
}

/**
 * Funnel chart component for showing conversion/stage progression
 */
export function FunnelChart({ config, className }: FunnelChartProps) {
  const { data, colors } = config;
  const series = data.series || [];

  if (series.length === 0 || !series[0]?.data?.length) {
    return (
      <div className={`flex items-center justify-center h-64 text-zinc-500 ${className || ''}`}>
        No data available
      </div>
    );
  }

    const firstValue = series[0].data[0]?.y || 1;
    const funnelData: FunnelStep[] = series[0].data.map((point, index) => ({
      name: point.label || String(point.x),
      value: point.y,
      percentage: firstValue > 0 ? (point.y / firstValue * 100) : 0,
      color: getChartColor(index),
    }));

    const maxValue = Math.max(...funnelData.map((d) => d.value), 1);

  return (
    <div className={className}>
      <div className="space-y-3">
        {funnelData.map((step, index) => (
          <div key={index} className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {step.name}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {new Intl.NumberFormat().format(step.value)}
                </span>
                {step.percentage !== undefined && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">
                    ({step.percentage.toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
            <div className="relative h-8 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded flex items-center justify-end pr-3"
                style={{
                  width: `${(step.value / maxValue) * 100}%`,
                  backgroundColor: getChartColor(index),
                }}
              >
                <span className="text-xs font-semibold text-white drop-shadow">
                  {step.percentage?.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
