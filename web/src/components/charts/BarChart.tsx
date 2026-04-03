"use client"

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useMemo } from "react"
import {
  Bar,
  CartesianGrid,
  BarChart as RechartsBarChart,
  XAxis,
  YAxis,
} from "recharts"
import type { ChartConfig as LegacyChartConfig } from "./types"

interface BarChartProps {
  config: LegacyChartConfig
  className?: string
  skipAnimation?: boolean
}

// Format date strings to readable format
function formatXLabel(value: string): string {
  // Check if it's an ISO date string
  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) ||
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date)
    }
  }
  return value
}

/**
 * Bar chart component using Recharts with shadcn/ui pattern
 */
export function BarChart({ config, className, skipAnimation }: BarChartProps) {
  const { data, options, colors } = config
  const series = data.series || []

  if (series.length === 0 || !series[0]?.data?.length) {
    return (
      <div
        className={`flex items-center justify-center h-64 text-muted-foreground ${className || ""}`}
      >
        No data available
      </div>
    )
  }

  const isHorizontal = options.horizontal
  const isStacked = options.stacked

  // Build shadcn chart config from legacy config with sanitized keys
  const sanitizedKeys = series.map((s, idx) => ({
    original: s.name,
    sanitized: s.name.replace(/\s+/g, "-").toLowerCase(),
    color: colors?.palette?.[idx] || s.color || `var(--chart-${(idx % 5) + 1})`,
  }))

  const shadcnConfig: ChartConfig = sanitizedKeys.reduce((acc, item) => {
    acc[item.sanitized] = {
      label: item.original,
      color: item.color,
    }
    return acc
  }, {} as ChartConfig)

  // Prepare data for Recharts with sanitized keys
  const chartData = useMemo(() => {
    return (
      series[0]?.data?.map((point, index) => {
        const row: Record<string, unknown> = {
          _x: point.x,
          _label: point.label || String(point.x),
        }

        series.forEach((s, idx) => {
          if (s.data[index]) {
            row[sanitizedKeys[idx].sanitized] = s.data[index].y
          }
        })

        return row
      }) || []
    )
  }, [series, sanitizedKeys])

  return (
    <ChartContainer config={shadcnConfig} className={className}>
      <RechartsBarChart
        data={chartData}
        layout={isHorizontal ? "vertical" : "horizontal"}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey={isHorizontal ? undefined : "_x"}
          type={isHorizontal ? "number" : "category"}
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={
            isHorizontal ? undefined : value => formatXLabel(String(value))
          }
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={value =>
            typeof value === "number" ? value.toLocaleString() : String(value)
          }
        />
        <ChartTooltip
          content={<ChartTooltipContent />}
          labelFormatter={label => {
            if (typeof label === "string" && /^\d{4}-\d{2}-\d{2}/.test(label)) {
              const date = new Date(label)
              if (!isNaN(date.getTime())) {
                return new Intl.DateTimeFormat("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(date)
              }
            }
            return String(label)
          }}
        />
        {sanitizedKeys.map(item => (
          <Bar
            key={item.original}
            dataKey={item.sanitized}
            name={item.original}
            fill={`var(--color-${item.sanitized})`}
            radius={isHorizontal ? [0, 4, 4, 0] : 4}
            stackId={isStacked ? "stack" : undefined}
            animationDuration={skipAnimation ? 0 : 500}
          />
        ))}
      </RechartsBarChart>
    </ChartContainer>
  )
}
