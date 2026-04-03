import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

interface RefreshButtonProps {
  onRefresh: () => void | Promise<void>;
  isRefreshing: boolean;
  lastRefresh?: Date | null;
  className?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
}

// Hoisted outside component to avoid recreating on every render
const ONE_MINUTE = 60000;
const ONE_HOUR = 60; // in minutes
const ONE_DAY = 24; // in hours

function formatLastRefresh(date: Date | null | undefined): string {
  if (!date) return "Never";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / ONE_MINUTE);
  const diffHours = Math.floor(diffMins / ONE_HOUR);
  const diffDays = Math.floor(diffHours / ONE_DAY);

  if (diffMins < 1) return "Just now";
  if (diffMins < ONE_HOUR) return `${diffMins}m ago`;
  if (diffHours < ONE_DAY) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function RefreshButton({
  onRefresh,
  isRefreshing,
  lastRefresh,
  className,
  variant = "ghost",
  size = "sm",
}: RefreshButtonProps) {
  const handleClick = useCallback(async () => {
    await onRefresh();
  }, [onRefresh]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs text-muted-foreground/80 hidden sm:inline tabular-nums">
        Updated: {formatLastRefresh(lastRefresh)}
      </span>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isRefreshing}
        className={cn(
          "gap-2",
          "hover:bg-accent/50 hover:border-accent/50",
          "transition-all duration-150",
          isRefreshing && "opacity-70"
        )}
      >
        <RefreshCw
          className={cn(
            "h-4 w-4 transition-transform duration-500",
            isRefreshing && "animate-spin"
          )}
        />
        <span className="hidden sm:inline">
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </span>
      </Button>
    </div>
  );
}
