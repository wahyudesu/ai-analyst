import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  className?: string;
  trend?: "up" | "down" | "neutral";
  format?: "currency" | "number" | "percentage";
}

const formatValue = (value: string | number, format?: string): string => {
  if (typeof value === "string") return value;

  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case "percentage":
      return `${value.toFixed(1)}%`;
    case "number":
    default:
      return new Intl.NumberFormat("en-US").format(value);
  }
};

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  className,
  trend,
  format,
}: MetricCardProps) {
  // Determine trend based on change value if not explicitly provided
  const calculatedTrend = trend ?? (change === undefined ? "neutral" : change > 0 ? "up" : change < 0 ? "down" : "neutral");

  const TrendIcon = calculatedTrend === "up" ? TrendingUp : calculatedTrend === "down" ? TrendingDown : Minus;
  const trendColor = calculatedTrend === "up" ? "text-green-600 dark:text-green-400" : calculatedTrend === "down" ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400";

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="px-4 py-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {Icon && (
              <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <div className="flex flex-col justify-center">
              <p className="text-xs text-muted-foreground leading-tight">
                {title}
              </p>
              <p className="text-lg font-bold text-foreground leading-tight">
                {formatValue(value, format)}
              </p>
            </div>
          </div>
          {change !== undefined && (
            <div className="flex items-center gap-0.5 shrink-0">
              <TrendIcon className={cn("w-3 h-3", trendColor)} />
              <span className={cn("text-xs font-medium", trendColor)}>
                {change > 0 ? "+" : ""}{change}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
