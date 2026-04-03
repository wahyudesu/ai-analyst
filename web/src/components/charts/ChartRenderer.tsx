'use client';

import { useRef, useCallback } from 'react';
import { Download } from 'lucide-react';
import { BarChart } from './BarChart';
import { LineChart } from './LineChart';
import { AreaChart } from './AreaChart';
import { PieChart } from './PieChart';
import type { ChartConfig } from './types';

interface ChartRendererProps {
  config: ChartConfig;
  className?: string;
  skipAnimation?: boolean;
}

// Constants hoisted outside component
const DEFAULT_FILENAME = 'chart';
const CANVAS_SCALE = 2; // 2x for better quality
const WHITE_BACKGROUND = '#ffffff';

type ChartType = ChartConfig['chartType'];

// ============================================================================
// Download utility - hoisted outside component to avoid recreating
// ============================================================================

async function downloadChartAsImage(
  element: HTMLElement | null,
  filename: string = DEFAULT_FILENAME
): Promise<void> {
  if (!element) return;

  try {
    const svgElements = element.querySelectorAll('svg');
    if (svgElements.length === 0) {
      console.warn('No SVG found in chart container');
      return;
    }

    // Get the first SVG
    const svg = svgElements[0] as SVGElement;

    // Get SVG dimensions
    const svgRect = svg.getBoundingClientRect();
    const width = svgRect.width || 800;
    const height = svgRect.height || 400;

    // Serialize SVG to string
    const svgData = new XMLSerializer().serializeToString(svg);

    // Create canvas for PNG conversion
    const canvas = document.createElement('canvas');
    canvas.width = width * CANVAS_SCALE;
    canvas.height = height * CANVAS_SCALE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    ctx.scale(CANVAS_SCALE, CANVAS_SCALE);

    // Create blob and image from SVG
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      // Draw white background (for dark mode compatibility)
      ctx.fillStyle = WHITE_BACKGROUND;
      ctx.fillRect(0, 0, width, height);

      // Draw the image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to PNG and download
      canvas.toBlob((blob) => {
        if (blob) {
          const pngUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = `${filename}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(pngUrl);
        }
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.onerror = () => {
      // Fallback to SVG download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  } catch (error) {
    console.error('Failed to download chart:', error);
  }
}

// ============================================================================
// Chart render function - replaces IIFE pattern
// ============================================================================

function renderChart(config: ChartConfig, skipAnimation?: boolean) {
  const { chartType } = config;

  switch (chartType) {
    case 'bar':
      return <BarChart config={config} skipAnimation={skipAnimation} />;
    case 'line':
      return <LineChart config={config} skipAnimation={skipAnimation} />;
    case 'area':
      return <AreaChart config={config} skipAnimation={skipAnimation} />;
    case 'pie':
      return <PieChart config={config} skipAnimation={skipAnimation} />;
    default:
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Unknown chart type: {chartType}
        </div>
      );
  }
}

// ============================================================================
// Main component
// ============================================================================

/**
 * Main chart renderer component that switches based on chartType
 * Use this component to render any chart type from the backend configuration
 */
export function ChartRenderer({ config, className, skipAnimation }: ChartRendererProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { chartType, title, subtitle } = config;

  const handleDownload = useCallback(() => {
    const filename = title ? title.replace(/\s+/g, '-') : DEFAULT_FILENAME;
    downloadChartAsImage(chartRef.current, filename);
  }, [title]);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          {title && <h3 className="text-lg font-semibold text-foreground">{title}</h3>}
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <button
          onClick={handleDownload}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
          title="Download chart as image"
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
        </button>
      </div>

      <div ref={chartRef}>
        {renderChart(config, skipAnimation)}
      </div>
    </div>
  );
}
