'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { useTooltip, Tooltip, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { motion } from 'motion/react';
import { getChartColor } from './colors';
import type { ChartConfig } from './types';

interface HorizontalBarChartProps {
  config: ChartConfig;
  className?: string;
}

interface TooltipData {
  x: string;
  y: number;
  color: string;
}

/**
 * Horizontal bar chart component for funnel charts and rankings
 */
export function HorizontalBarChart({ config, className }: HorizontalBarChartProps) {
  const { data, xAxis, options, colors } = config;
  const series = data.series || [];
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip<TooltipData>();

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(width, 300), height: 300 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

    if (series.length === 0 || !series[0]?.data?.length) {
      return (
        <div className={`flex items-center justify-center ${className || ''}`} style={{ height: '300px' }}>
          <p className="text-muted-foreground text-sm">No data available</p>
        </div>
      );
    }

  const chartData = series[0].data.map((point) => ({
    name: point.label || String(point.x),
    value: point.y,
    originalX: point.x,
  }));

  const margin = { top: 10, right: 10, bottom: 10, left: 10 };
  const width = dimensions.width;
  const height = 300;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;


  const yScale = useMemo(
    () =>
      scaleBand({
        range: [0, innerHeight],
        round: true,
        domain: chartData.map((d) => d.name),
        padding: 0.2,
      }),
    [chartData, innerHeight]
  );

    const xScale = useMemo(() => {
      const maxValue = Math.max(...chartData.map((d) => d.value), 1);
      return scaleLinear({
        range: [0, innerWidth],
        round: true,
        domain: [0, maxValue * 1.05],
      });
    }, [chartData, innerWidth]);

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '300px' }}>
      <svg width={width} height={height}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {chartData.map((d, i) => {
            const barHeight = yScale.bandwidth();
            const y = yScale(d.name) ?? 0;
            const barWidth = xScale(d.value) ?? 0;
            const color = getChartColor(i);
            const isHovered = hoveredBar === i;

            return (
              <g key={i}>
                {/* Label */}
                <text
                  x={0}
                  y={y + barHeight / 2}
                  fill="hsl(var(--foreground))"
                  fontSize={11}
                  textAnchor="start"
                  dominantBaseline="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  {d.name}
                </text>

                {/* Bar */}
                <motion.rect
                  x={4}
                  y={y}
                  height={barHeight}
                  fill={color}
                  opacity={isHovered ? 1 : hoveredBar !== null ? 0.5 : 1}
                  initial={{ width: 0 }}
                  animate={{ width: barWidth }}
                  transition={{
                    duration: 0.5,
                    ease: [0.85, 0, 0.15, 1],
                    delay: i * 0.02,
                  }}
                  onMouseEnter={(event) => {
                    setHoveredBar(i);
                    const coords = localPoint(event);
                    if (!coords) return;
                    showTooltip({
                      tooltipLeft: coords.x + margin.left,
                      tooltipTop: coords.y + margin.top,
                      tooltipData: { x: d.name, y: d.value, color },
                    });
                  }}
                  onMouseMove={(event) => {
                    const coords = localPoint(event);
                    if (!coords) return;
                    showTooltip({
                      tooltipLeft: coords.x + margin.left,
                      tooltipTop: coords.y + margin.top,
                      tooltipData: { x: d.name, y: d.value, color },
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredBar(null);
                    hideTooltip();
                  }}
                  style={{ cursor: 'pointer' }}
                />

                {/* Value label at end of bar */}
                <motion.text
                  x={barWidth + 8}
                  y={y + barHeight / 2}
                  fill="hsl(var(--muted-foreground))"
                  fontSize={10}
                  textAnchor="start"
                  dominantBaseline="middle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 + 0.3 }}
                  style={{ pointerEvents: 'none' }}
                >
                  {d.value.toLocaleString()}
                </motion.text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <Tooltip
          style={{
            ...defaultStyles,
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            color: 'hsl(var(--popover-foreground))',
            boxShadow: 'hsl(var(--shadow))',
            fontSize: '12px',
            padding: '8px 12px',
          }}
          left={tooltipLeft}
          top={tooltipTop}
        >
          <div>
            <div className="text-xs text-muted-foreground mb-1">{tooltipData.x}</div>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tooltipData.color }}
              />
              <span className="text-xs font-bold">
                {typeof tooltipData.y === 'number'
                  ? tooltipData.y.toLocaleString()
                  : tooltipData.y}
              </span>
            </div>
          </div>
        </Tooltip>
      )}
    </div>
  );
}
