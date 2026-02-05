'use client';

import { BarChart } from './BarChart';
import { LineChart } from './LineChart';
import { AreaChart } from './AreaChart';
import { PieChart } from './PieChart';
import type { ChartConfig } from './types';

interface ChartRendererProps {
  config: ChartConfig;
  className?: string;
}

/**
 * Main chart renderer component that switches based on chartType
 * Use this component to render any chart type from the backend configuration
 */
export function ChartRenderer({ config, className }: ChartRendererProps) {
  const { chartType, title, subtitle } = config;

  return (
    <div className={className}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>}
          {subtitle && <p className="text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>}
        </div>
      )}

      {(() => {
        switch (chartType) {
          case 'bar':
            return <BarChart config={config} />;
          case 'line':
            return <LineChart config={config} />;
          case 'area':
            return <AreaChart config={config} />;
          case 'pie':
            return <PieChart config={config} />;
          default:
            return (
              <div className="flex items-center justify-center h-64 text-zinc-500">
                Unknown chart type: {chartType}
              </div>
            );
        }
      })()}
    </div>
  );
}
