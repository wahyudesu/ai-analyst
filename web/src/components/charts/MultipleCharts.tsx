'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { MultipleChartsConfig, ChartsLayout } from './types';
import { ChartRenderer } from './ChartRenderer';

interface MultipleChartsProps {
  config: MultipleChartsConfig;
}

export function MultipleCharts({ config }: MultipleChartsProps) {
  const { charts, layout = 'grid', title, description } = config;
  const [activeTab, setActiveTab] = useState(0);

  if (charts.length === 0) {
    return (
      <div className="text-zinc-500 dark:text-zinc-400 text-center py-4">
        No charts to display
      </div>
    );
  }

  if (charts.length === 1) {
    return <ChartRenderer config={charts[0]} />;
  }

  // Tabs layout
  if (layout === 'tabs') {
    return (
      <div className="space-y-4">
        {title && (
          <div className="border-b border-zinc-200 dark:border-zinc-700 pb-2">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                {description}
              </p>
            )}
          </div>
        )}
        <div className="border-b border-zinc-200 dark:border-zinc-700">
          <nav className="flex space-x-4" aria-label="Tabs">
            {charts.map((chart, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === index
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-300'
                  }
                `}
              >
                {chart.chartType.charAt(0).toUpperCase() + chart.chartType.slice(1)} Chart
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-4">
          <ChartRenderer key={activeTab} config={charts[activeTab]} />
        </div>
      </div>
    );
  }

  // Vertical layout
  if (layout === 'vertical') {
    return (
      <div className="space-y-6">
        {title && (
          <div className="text-center">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                {description}
              </p>
            )}
          </div>
        )}
        {charts.map((chart, index) => (
          <div key={index} className="bg-white dark:bg-zinc-900 rounded-lg p-4">
            <ChartRenderer config={chart} />
          </div>
        ))}
      </div>
    );
  }

  // Grid layout (default)
  return (
    <div className="space-y-4">
      {title && (
        <div className="text-center">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {description}
            </p>
          )}
        </div>
      )}
      <div
        className={`grid gap-4 ${
          charts.length === 2
            ? 'grid-cols-1 md:grid-cols-2'
            : charts.length === 3
            ? 'grid-cols-1 md:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2'
        }`}
      >
        {charts.map((chart, index) => (
          <div key={index} className="bg-white dark:bg-zinc-900 rounded-lg p-4">
            <ChartRenderer config={chart} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper component to render collapsible multiple charts
interface CollapsibleMultipleChartsProps extends MultipleChartsProps {
  defaultOpen?: boolean;
}

export function CollapsibleMultipleCharts({
  config,
  defaultOpen = false,
}: CollapsibleMultipleChartsProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-500 rounded-full" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {config.title || `Multiple Charts (${config.charts.length} visualizations)`}
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-500" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 bg-white dark:bg-zinc-900">
          <MultipleCharts config={config} />
        </div>
      )}
    </div>
  );
}
