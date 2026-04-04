"use client"

import { cn } from "@/lib/utils"
import { memo } from "react"

export type UptimeStatus = "Operational" | "Downtime" | "Degraded" | "Inactive"

export interface UptimeData {
  tooltip: string
  status: UptimeStatus
}

const statusColorMapping: Record<UptimeStatus, string> = {
  Operational: "bg-emerald-500 dark:bg-emerald-500",
  Downtime: "bg-red-500 dark:bg-red-500",
  Degraded: "bg-yellow-500 dark:bg-yellow-500",
  Inactive: "bg-gray-300 dark:bg-gray-700",
}

interface TrackerProps {
  data: (UptimeData & { color?: string })[]
  className?: string
}

export const Tracker = memo(function Tracker({ data, className }: TrackerProps) {
  return (
    <div className={cn("flex gap-1", className)}>
      {data.map((item, index) => {
        const colorClass = item.color || statusColorMapping[item.status]
        return (
          <div
            key={index}
            className={cn(
              "h-2.5 rounded-sm flex-1 min-w-[3px] transition-all hover:scale-y-125",
              colorClass
            )}
            title={item.tooltip}
            role="graphics-symbol"
            aria-label={`${item.tooltip}: ${item.status}`}
          />
        )
      })}
    </div>
  )
})

// Helper function to generate uptime data for a given period
export function generateUptimeData(
  days: number,
  uptimePercentage: number
): (UptimeData & { color?: string })[] {
  const data: (UptimeData & { color?: string })[] = []
  const now = new Date()

  const operationalDays = Math.floor(days * (uptimePercentage / 100))
  const downtimeDays = days - operationalDays

  // Create array with operational days
  for (let i = 0; i < operationalDays; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - (days - i - 1))
    data.push({
      tooltip: date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      status: "Operational",
      color: statusColorMapping.Operational,
    })
  }

  // Add some downtime days scattered throughout
  const downtimeIndices: number[] = []
  while (
    downtimeIndices.length < downtimeDays &&
    downtimeIndices.length < days
  ) {
    const randomIndex = Math.floor(Math.random() * days)
    if (!downtimeIndices.includes(randomIndex)) {
      downtimeIndices.push(randomIndex)
    }
  }

  downtimeIndices.forEach(index => {
    if (data[index]) {
      const date = new Date(now)
      date.setDate(date.getDate() - (days - index - 1))
      data[index] = {
        tooltip: date.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        status: "Downtime",
        color: statusColorMapping.Downtime,
      }
    }
  })

  return data
}
