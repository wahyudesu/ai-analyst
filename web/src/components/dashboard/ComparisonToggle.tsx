"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { TrendingUp } from "lucide-react"
import { useState } from "react"

export type ComparisonMode = "wow" | "mom" | "yoy"

export interface ComparisonOption {
  value: ComparisonMode
  label: string
  description: string
}

const comparisonOptions: ComparisonOption[] = [
  { value: "wow", label: "WoW", description: "Week over Week" },
  { value: "mom", label: "MoM", description: "Month over Month" },
  { value: "yoy", label: "YoY", description: "Year over Year" },
]

interface ComparisonToggleProps {
  value: ComparisonMode
  onChange: (value: ComparisonMode) => void
  className?: string
  size?: "sm" | "default"
}

export function ComparisonToggle({
  value,
  onChange,
  className,
  size = "sm",
}: ComparisonToggleProps) {
  const [open, setOpen] = useState(false)
  const selectedOption = comparisonOptions.find(opt => opt.value === value)

  const handleSelect = (newValue: ComparisonMode) => {
    onChange(newValue)
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          className={cn(
            "h-auto px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 gap-1.5 rounded-md",
            "data-[state=open]:bg-accent/50 data-[state=open]:text-foreground",
            "transition-colors",
            className
          )}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{selectedOption?.label || "MoM"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[140px]">
        {comparisonOptions.map(option => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={cn(
              "flex flex-col items-start gap-0.5 py-2.5 cursor-pointer",
              value === option.value && "bg-accent/50"
            )}
          >
            <span className="text-sm font-medium">{option.label}</span>
            <span className="text-xs text-muted-foreground">
              {option.description}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Helper to convert ComparisonMode to SQL interval
export function comparisonModeToInterval(mode: ComparisonMode): string {
  switch (mode) {
    case "wow":
      return "7 days"
    case "mom":
      return "30 days"
    case "yoy":
      return "365 days"
    default:
      return "30 days"
  }
}

// Helper to get previous period offset
export function getPreviousPeriodOffset(mode: ComparisonMode): {
  currentOffset: string
  previousOffset: string
} {
  switch (mode) {
    case "wow":
      return {
        currentOffset: "7 days",
        previousOffset: "14 days", // 7-14 days ago
      }
    case "mom":
      return {
        currentOffset: "30 days",
        previousOffset: "60 days", // 30-60 days ago
      }
    case "yoy":
      return {
        currentOffset: "365 days",
        previousOffset: "730 days", // 365-730 days ago
      }
    default:
      return {
        currentOffset: "30 days",
        previousOffset: "60 days",
      }
  }
}
