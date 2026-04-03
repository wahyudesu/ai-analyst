"use client"

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"
import type { ChartConfig as LegacyChartConfig } from "./types"

interface DualAxisChartProps {
  config: LegacyChartConfig
  className?: string
  leftAxisLabel?: string
  rightAxisLabel?: string
}

/**
 * Dual axis chart combining bars and lines with shadcn/ui pattern
 * Useful for showing signups (bars) with activation rate (line)
 */
export function DualAxisChart({
  config,
  className,
  leftAxisLabel = "",
  rightAxisLabel = "",
}: DualAxisChartProps) {
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
  const chartData = series[0].data.map((point, index) => {
    const row: Record<string, unknown> = {
      _x: point.x,
      _label: point.label,
    }

    series.forEach((s, idx) => {
      if (s.data[index]) {
        row[sanitizedKeys[idx].sanitized] = s.data[index].y
      }
    })

    return row
  })

  // First series is bars, second is line
  const barSeries = sanitizedKeys[0]
  const lineSeries = sanitizedKeys[1]

  return (
    <ChartContainer config={shadcnConfig} className={className}>
      <ComposedChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="_x"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          yAxisId="left"
          tickLine={false}
          axisLine={false}
          tickFormatter={value =>
            typeof value === "number" ? value.toLocaleString() : String(value)
          }
          label={{
            value: leftAxisLabel,
            angle: -90,
            position: "insideLeft",
            className: "fill-muted-foreground text-[10px]",
          }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickLine={false}
          axisLine={false}
          tickFormatter={value =>
            typeof value === "number" ? value.toLocaleString() : String(value)
          }
          label={{
            value: rightAxisLabel,
            angle: 90,
            position: "insideRight",
            className: "fill-muted-foreground text-[10px]",
          }}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {options.legend && <ChartLegend content={<ChartLegendContent />} />}
        {barSeries && (
          <Bar
            yAxisId="left"
            dataKey={barSeries.sanitized}
            name={barSeries.original}
            fill={`var(--color-${barSeries.sanitized})`}
            radius={4}
          />
        )}
        {lineSeries && (
          <Line
            yAxisId="right"
            type="monotone"
            dataKey={lineSeries.sanitized}
            name={lineSeries.original}
            stroke={`var(--color-${lineSeries.sanitized})`}
            strokeWidth={2}
            dot={{ fill: `var(--color-${lineSeries.sanitized})` }}
          />
        )}
      </ComposedChart>
    </ChartContainer>
  )
}
