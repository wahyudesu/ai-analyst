"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimeRange = "7d" | "30d" | "90d" | "12w" | "all" | "custom";

export interface TimeRangeOption {
  value: TimeRange;
  label: string;
  description: string;
}

const timeRangeOptions: TimeRangeOption[] = [
  { value: "7d", label: "7 Days", description: "Last 7 days" },
  { value: "30d", label: "30 Days", description: "Last 30 days" },
  { value: "90d", label: "90 Days", description: "Last 90 days" },
  { value: "12w", label: "12 Weeks", description: "Last 12 weeks" },
  { value: "all", label: "All Time", description: "All historical data" },
];

interface TimelineFilterProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
  customStartDate?: Date | null;
  customEndDate?: Date | null;
  onCustomRangeChange?: (start: Date | null, end: Date | null) => void;
  className?: string;
}

export function TimelineFilter({
  value,
  onChange,
  customStartDate,
  customEndDate,
  onCustomRangeChange,
  className,
}: TimelineFilterProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  // Cleanup modal state on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (isCustomOpen) {
        setIsCustomOpen(false);
      }
    };
  }, [isCustomOpen]);

  const selectedOption = timeRangeOptions.find((opt) => opt.value === value);
  const displayLabel = value === "custom" && customStartDate && customEndDate
    ? `${customStartDate.toLocaleDateString()} - ${customEndDate.toLocaleDateString()}`
    : selectedOption?.label || "Select range";

  const handleSelect = (rangeValue: TimeRange) => {
    if (rangeValue === "custom") {
      setIsCustomOpen(true);
    } else {
      onChange(rangeValue);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-2 min-w-[140px] justify-between", className)}
          >
            <Calendar className="w-4 h-4" />
            <span className="truncate">{displayLabel}</span>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuLabel>Time Range</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {timeRangeOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={cn(
                "flex flex-col items-start gap-1",
                value === option.value && "bg-accent"
              )}
            >
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">
                {option.description}
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleSelect("custom")}>
            <span className="font-medium">Custom Range...</span>
            <span className="text-xs text-muted-foreground">
              Select specific dates
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Custom Date Range Modal */}
      {isCustomOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold mb-4">Custom Date Range</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Start Date</label>
                <input
                  type="date"
                  value={customStartDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) =>
                    onCustomRangeChange?.(
                      e.target.value ? new Date(e.target.value) : null,
                      customEndDate || null
                    )
                  }
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">End Date</label>
                <input
                  type="date"
                  value={customEndDate?.toISOString().split('T')[0] || ''}
                  onChange={(e) =>
                    onCustomRangeChange?.(
                      customStartDate || null,
                      e.target.value ? new Date(e.target.value) : null
                    )
                  }
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsCustomOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (customStartDate && customEndDate) {
                    onChange("custom");
                    setIsCustomOpen(false);
                  }
                }}
                disabled={!customStartDate || !customEndDate}
                className="flex-1"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Helper to convert TimeRange to SQL interval
export function timeRangeToInterval(timeRange: TimeRange): string {
  switch (timeRange) {
    case "7d":
      return "7 days";
    case "30d":
      return "30 days";
    case "90d":
      return "90 days";
    case "12w":
      return "84 days"; // 12 weeks
    case "all":
      return "100 years"; // Effectively all time
    case "custom":
      return "30 days"; // Fallback, actual dates used in query
    default:
      return "30 days";
  }
}
