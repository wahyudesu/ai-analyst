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
        <div className="text-muted-foreground text-center py-4">
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
            <div className="border-b border-border pb-2">
              <h3 className="text-lg font-semibold text-foreground">
                {title}
              </h3>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
          )}
          <div className="border-b border-border">
            <nav className="flex space-x-4" aria-label="Tabs">
              {charts.map((chart, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTab(index)}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === index
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
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
              <h3 className="text-lg font-semibold text-foreground">
                {title}
              </h3>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
          )}
          {charts.map((chart, index) => (
            <div key={index} className="bg-card rounded-lg p-4">
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
            <h3 className="text-lg font-semibold text-foreground">
              {title}
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
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
            <div key={index} className="bg-card rounded-lg p-4">
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
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full" />
          <span className="text-sm font-medium text-foreground">
            {config.title || `Multiple Charts (${config.charts.length} visualizations)`}
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 bg-card">
          <MultipleCharts config={config} />
        </div>
      )}
    </div>
  );
}
