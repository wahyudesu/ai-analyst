"use client"

import * as React from "react"
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { cn } from "@/lib/utils"

interface LineChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: Record<string, any>[]
  dataKey: string
  config?: Record<string, { label: string; color?: string }>
  containerHeight?: number
  xAxisProps?: { interval?: number }
}

export function LineChart({
  data,
  dataKey,
  config,
  containerHeight = 200,
  xAxisProps,
  className,
  ...props
}: LineChartProps) {
  const seriesKeys = React.useMemo(
    () => Object.keys(data[0] || {}).filter((key) => key !== dataKey),
    [data, dataKey]
  )

  // Build chart config
  const chartConfig: ChartConfig = React.useMemo(() => {
    const colors = [
      "hsl(var(--chart-1))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
      "hsl(var(--chart-5))",
    ]

    return seriesKeys.reduce((acc, key, index) => {
      acc[key] = {
        label: config?.[key]?.label || key,
        color: config?.[key]?.color || colors[index % colors.length],
      }
      return acc
    }, {} as ChartConfig)
  }, [seriesKeys, config])

  return (
    <ChartContainer config={chartConfig} className={cn("w-full", className)} {...props}>
      <ResponsiveContainer width="100%" height={containerHeight}>
        <RechartsLineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey={dataKey}
            tickLine={false}
            tickMargin={8}
            axisLine={false}
            interval={xAxisProps?.interval ?? "preserveStartEnd"}
            className="text-xs"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => (typeof value === "number" ? value.toLocaleString() : value)}
            className="text-xs"
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          {seriesKeys.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={`var(--color-${key})`}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
