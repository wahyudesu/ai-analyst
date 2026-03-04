'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { useTooltip, Tooltip, defaultStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { motion } from 'motion/react';
import { getChartColor } from './colors';
import type { ChartConfig } from './types';

// Format date strings to readable format
function formatXLabel(value: string): string {
  // Check if it's an ISO date string
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const day = date.getDate();
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      return `${month} ${day}`;
    }
  }
  return value;
}

interface BarChartProps {
  config: ChartConfig;
  className?: string;
}

interface TooltipData {
  x: string;
  y: number;
  series: string;
  color: string;
}

export function BarChart({ config, className }: BarChartProps) {
  const { data, xAxis, yAxis, options, colors } = config;
  const series = data.series || [];
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

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

  const chartData = useMemo(() => {
    return series[0]?.data?.map((point, index) => ({
      x: point.x,
      y: series.map((s) => s.data[index]?.y ?? 0),
      label: point.label || String(point.x),
    })) || [];
  }, [series]);

  const isHorizontal = options.horizontal;
  const isStacked = options.stacked;

    const margin = {
      top: 10,
      right: 40,
      bottom: isHorizontal ? 30 : 30,
      left: isHorizontal ? 80 : 40,
    };

  const width = dimensions.width;
  const height = 300;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const xScale = useMemo(
    () =>
      scaleBand({
        range: isHorizontal ? [0, innerHeight] : [0, innerWidth],
        round: true,
        domain: chartData.map((d) => String(d.x)),
        padding: 0.15,
      }),
    [chartData, innerWidth, innerHeight, isHorizontal]
  );

    const maxY = useMemo(() => {
      let max: number;
      if (isStacked) {
        max = Math.max(...chartData.map((d) => d.y.reduce((a, b) => a + b, 0)));
      } else {
        max = Math.max(...chartData.map((d) => Math.max(...d.y)));
      }
      // Ensure maxY is never 0 to avoid scale issues
      return Math.max(max, 1);
    }, [chartData, isStacked]);

    const yScale = useMemo(
      () =>
        scaleLinear({
          range: isHorizontal ? [0, innerWidth] : [innerHeight, 0],
          round: true,
          domain: [0, maxY * 1.05 || 1],
        }),
      [innerWidth, innerHeight, maxY, isHorizontal]
    );

  const getBarColor = (seriesIndex: number) => {
    // Always use CSS variables for consistent colors
    return getChartColor(seriesIndex);
  };

    if (series.length === 0 || chartData.length === 0 || !series[0]?.data?.length) {
      return (
        <div className={`flex items-center justify-center ${className || ''}`} style={{ height: '300px' }}>
          <p className="text-muted-foreground text-sm">No data available</p>
        </div>
      );
    }

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '300px' }}>
      <svg width={width} height={height}>
          <g transform={`translate(${margin.left},${margin.top})`}>
            {chartData.map((d, dataIndex) => {
              const bandwidth = xScale.bandwidth() || 1;
              const barWidth = isStacked ? bandwidth : bandwidth / series.length;

            return series.map((s, seriesIndex) => {
              const value = d.y[seriesIndex];
              const color = getBarColor(seriesIndex);
              const barKey = `${s.name}-${dataIndex}`;

                  let x = 0, y = 0, barHeight = 0, barWidthValue = 0;

                  if (isHorizontal) {
                    x = 0;
                    y = xScale(String(d.x)) ?? 0;
                    barWidthValue = Math.max(yScale(value) ?? 0, 0);
                    barHeight = Math.max(barWidth, 0);

                  if (isStacked && seriesIndex > 0) {
                    const prevValue = d.y.slice(0, seriesIndex).reduce((a, b) => a + b, 0);
                    x = yScale(prevValue) ?? 0;
                  }
                } else {
                  x = xScale(String(d.x)) ?? 0;
                  y = yScale(value) ?? 0;
                  barWidthValue = Math.max(barWidth, 0);
                  barHeight = Math.max(innerHeight - y, 0);

                  if (isStacked && seriesIndex > 0) {
                    const prevValue = d.y.slice(0, seriesIndex).reduce((a, b) => a + b, 0);
                    y = yScale(prevValue + value) ?? 0;
                    barHeight = Math.max((yScale(prevValue) ?? 0) - y, 0);
                  }

                  if (!isStacked) {
                    x += seriesIndex * barWidth;
                  }
                }

                  const isHovered = hoveredBar === barKey;

                  // Ensure all values are valid numbers
                  const safeX = Number.isFinite(x) ? x : 0;
                  const safeY = Number.isFinite(y) ? y : 0;
                  const safeWidth = Number.isFinite(barWidthValue) ? Math.max(barWidthValue, 0) : 0;
                  const safeHeight = Number.isFinite(barHeight) ? Math.max(barHeight, 0) : 0;

                  return (
                    <g key={barKey}>
                      <motion.rect
                        x={safeX}
                        y={safeY}
                        width={safeWidth}
                        height={safeHeight}
                        fill={color}
                        rx={isHorizontal ? 4 : 2}
                        opacity={isHovered ? 1 : hoveredBar ? 0.5 : 1}
                        initial={isHorizontal ? { width: 0 } : { height: 0 }}
                        animate={{ width: safeWidth, height: safeHeight }}
                        transition={{
                          duration: 0.5,
                          ease: [0.85, 0, 0.15, 1],
                          delay: dataIndex * 0.02,
                        }}
                      onMouseEnter={(event) => {
                        setHoveredBar(barKey);
                        const coords = localPoint(event);
                        if (!coords) return;
                        showTooltip({
                          tooltipLeft: coords.x + margin.left,
                          tooltipTop: coords.y + margin.top,
                          tooltipData: { x: String(d.x), y: value, series: s.name, color },
                        });
                      }}
                      onMouseMove={(event) => {
                        const coords = localPoint(event);
                        if (!coords) return;
                        showTooltip({
                          tooltipLeft: coords.x + margin.left,
                          tooltipTop: coords.y + margin.top,
                          tooltipData: { x: String(d.x), y: value, series: s.name, color },
                        });
                      }}
                      onMouseLeave={() => {
                        setHoveredBar(null);
                        hideTooltip();
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    {/* Value label for horizontal bars */}
                    {isHorizontal && seriesIndex === 0 && (
                      <motion.text
                        x={(x + barWidthValue + 8)}
                        y={y + barHeight / 2}
                        className="text-foreground" fill="currentColor"
                        fontSize={12}
                        fontWeight={500}
                        textAnchor="start"
                        dominantBaseline="middle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: dataIndex * 0.02 + 0.3 }}
                        style={{ pointerEvents: 'none' }}
                      >
                        {value.toLocaleString()}
                      </motion.text>
                    )}
                  </g>
                );
              });
            })}

            {/* X Axis */}
            {isHorizontal ? (
              <AxisLeft
                scale={xScale}
                stroke="var(--border)"
                tickStroke="var(--border)"
                tickLabelProps={() => ({
                  className: 'text-foreground font-medium',
                  fill: 'currentColor',
                  fontSize: 11,
                  textAnchor: 'end',
                  dx: -8,
                  dy: 3,
                })}
              />
              ) : (
                <g transform={`translate(0, ${innerHeight})`}>
                  <AxisBottom
                    scale={xScale}
                    stroke="var(--border)"
                    tickStroke="var(--border)"
                    tickFormat={(value) => formatXLabel(String(value))}
                    tickLabelProps={() => ({
                      className: 'text-muted-foreground',
                      fill: 'currentColor',
                      fontSize: 10,
                      textAnchor: 'middle',
                      dy: 3,
                    })}
                  />
                </g>
              )}

              {/* Y Axis */}
              {!isHorizontal && (
                <AxisLeft
                  scale={yScale}
                  stroke="var(--border)"
                  tickStroke="var(--border)"
                  tickLabelProps={() => ({
                    className: 'text-muted-foreground',
                    fill: 'currentColor',
                    fontSize: 10,
                    textAnchor: 'end',
                    dx: -5,
                    dy: 3,
                  })}
                />
              )}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltipOpen && tooltipData && (
        <Tooltip
          style={{
            ...defaultStyles,
            backgroundColor: 'var(--popover)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--popover-foreground)',
            boxShadow: 'var(--shadow)',
            fontSize: '12px',
            padding: '8px 12px',
          }}
          left={tooltipLeft}
          top={tooltipTop}
        >
            <div>
              <div className="text-xs text-muted-foreground mb-1">{formatXLabel(tooltipData.x)}</div>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tooltipData.color }}
              />
              <span className="text-xs font-medium">{tooltipData.series}</span>
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
