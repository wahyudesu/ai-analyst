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

interface HorizontalBarChartProps {
  config: LegacyChartConfig
  className?: string
}

/**
 * Horizontal bar chart component using Recharts with shadcn/ui pattern
 */
export function HorizontalBarChart({
  config,
  className,
}: HorizontalBarChartProps) {
  const { data, colors } = config
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

  // Prepare data for Recharts
  const chartData = useMemo(() => {
    return series[0].data.map((point, index) => ({
      name: point.label || String(point.x),
      value: point.y,
      originalX: point.x,
    }))
  }, [series])

  // Build shadcn chart config with sanitized key
  const originalName = series[0]?.name || "value"
  const sanitizedName = originalName.replace(/\s+/g, "-").toLowerCase()
  const shadcnConfig: ChartConfig = {
    [sanitizedName]: {
      label: originalName,
      color: colors?.palette?.[0] || series[0]?.color || `var(--chart-1)`,
    },
  }

  return (
    <ChartContainer config={shadcnConfig} className={className}>
      <RechartsBarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 40, bottom: 10, left: 80 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis
          type="number"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={value =>
            typeof value === "number" ? value.toLocaleString() : String(value)
          }
        />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={75}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="value"
          name={originalName}
          fill={`var(--color-${sanitizedName})`}
          radius={[0, 4, 4, 0]}
        />
      </RechartsBarChart>
    </ChartContainer>
  )
}
