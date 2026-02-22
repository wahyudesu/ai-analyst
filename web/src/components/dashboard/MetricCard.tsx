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
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground">
              {formatValue(value, format)}
            </p>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                <TrendIcon className={cn("w-4 h-4", trendColor)} />
                <span className={cn("text-sm font-medium", trendColor)}>
                  {change > 0 ? "+" : ""}{change}%
                </span>
                {changeLabel && (
                  <span className="text-sm text-muted-foreground ml-1">
                    {changeLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          {Icon && (
            <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-lg">
              <Icon className="w-5 h-5 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
