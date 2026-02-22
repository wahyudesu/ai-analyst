import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  onRefresh: () => void | Promise<void>;
  isRefreshing: boolean;
  lastRefresh?: Date | null;
  className?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
}

export function RefreshButton({
  onRefresh,
  isRefreshing,
  lastRefresh,
  className,
  variant = "ghost",
  size = "sm",
}: RefreshButtonProps) {
  const formatLastRefresh = (date: Date | null | undefined): string => {
    if (!date) return "Never";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleClick = async () => {
    await onRefresh();
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        Updated: {formatLastRefresh(lastRefresh)}
      </span>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isRefreshing}
        className="gap-2"
      >
        <RefreshCw
          className={cn(
            "h-4 w-4",
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
