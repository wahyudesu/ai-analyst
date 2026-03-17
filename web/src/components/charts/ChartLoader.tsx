/**
 * ChartLoader - Wrapper for dynamic chart imports with Suspense and error handling
 */

import { Suspense, ComponentType, forwardRef } from "react";
import { ChartSkeleton } from "./dynamic";
import type { ChartConfig } from "./types";

interface ChartLoaderProps {
  config: ChartConfig | null;
  className?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

function ChartLoaderInner({ config, className, fallback, children }: ChartLoaderProps, ref: React.ForwardedRef<HTMLDivElement>) {
  if (!config) {
    return (
      <div ref={ref} className={`flex items-center justify-center h-64 text-muted-foreground ${className || ""}`}>
        No data available
      </div>
    );
  }

  return (
    <Suspense fallback={fallback || <ChartSkeleton className={className} />}>
      {children}
    </Suspense>
  );
}

export const ChartLoader = forwardRef(ChartLoaderInner);
