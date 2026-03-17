import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ComparisonToggle, ComparisonMode } from "./ComparisonToggle";
import { useMemo } from "react";

export interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  previousValue?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  className?: string;
  trend?: "up" | "down" | "neutral";
  format?: "currency" | "number" | "percentage";
  // New props for comparison functionality
  comparisonMode?: ComparisonMode;
  onComparisonChange?: (mode: ComparisonMode) => void;
  showComparisonToggle?: boolean;
  // Show previous period value
  showPreviousValue?: boolean;
  // Custom labels
  previousPeriodLabel?: string;
}

// Memoized formatters to avoid creating new Intl instances on every render
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US");

const formatValue = (value: string | number, format?: string): string => {
  if (typeof value === "string") return value;

  switch (format) {
    case "currency":
      return currencyFormatter.format(value);
    case "percentage":
      return `${value.toFixed(2)}%`;
    case "number":
    default:
      return numberFormatter.format(value);
  }
};

export function MetricCard({
  title,
  value,
  change,
  previousValue,
  changeLabel,
  icon: Icon,
  className,
  trend,
  format,
  comparisonMode = "mom",
  onComparisonChange,
  showComparisonToggle = false,
  showPreviousValue = false,
  previousPeriodLabel,
}: MetricCardProps) {
  // Determine trend based on change value if not explicitly provided
  const calculatedTrend = trend ?? (change === undefined ? "neutral" : change > 0 ? "up" : change < 0 ? "down" : "neutral");

  const TrendIcon = calculatedTrend === "up" ? TrendingUp : calculatedTrend === "down" ? TrendingDown : Minus;
  const trendColor = calculatedTrend === "up" ? "text-green-600 dark:text-green-400" : calculatedTrend === "down" ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400";

  // Format the change value - could be percentage or absolute
  const displayChange = change !== undefined
    ? (typeof change === 'number' && !changeLabel?.includes('%') && Math.abs(change) < 1)
      ? `${(change * 100).toFixed(1)}%`
      : (typeof change === 'number' && changeLabel?.includes('%'))
        ? `${change > 0 ? "+" : ""}${change.toFixed(1)}%`
        : `${change > 0 ? "+" : ""}${change}`
    : null;

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="px-4 py-3">
        <div className="flex flex-col gap-2">
          {/* Header row: title + optional comparison toggle */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {Icon && (
                <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <p className="text-xs text-muted-foreground truncate">
                {title}
              </p>
            </div>
            {showComparisonToggle && onComparisonChange && (
              <ComparisonToggle
                value={comparisonMode}
                onChange={onComparisonChange}
                size="sm"
              />
            )}
          </div>

          {/* Value row: main value + change indicator */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <p className="text-xl font-bold text-foreground leading-none">
                {formatValue(value, format)}
              </p>
              {displayChange && (
                <div className={cn("flex items-center gap-0.5 text-xs", trendColor)}>
                  <TrendIcon className="w-3 h-3" />
                  <span className="font-medium">{displayChange}</span>
                </div>
              )}
            </div>
          </div>

          {/* Optional: Previous period info */}
          {showPreviousValue && previousValue !== undefined && (
            <div className="pt-1 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                {previousPeriodLabel || "Previous period"}:{" "}
                <span className="font-medium text-foreground">
                  {formatValue(previousValue, format)}
                </span>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
