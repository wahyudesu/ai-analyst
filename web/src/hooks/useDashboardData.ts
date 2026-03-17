/**
 * Optimized hook for fetching dashboard data
 * Prevents useEffect dependency cascades by using refs for values that shouldn't trigger re-renders
 */

import { useState, useCallback, useRef, useEffect } from "react";

interface UseDashboardDataOptions<T> {
  apiUrl: string;
  ttl?: number; // Cache TTL in milliseconds
  enabled?: boolean;
}

interface UseDashboardDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  fetch: (bypassCache?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useDashboardData<T = unknown>({
  apiUrl,
  ttl = 5 * 60 * 1000, // 5 minutes default
  enabled = true,
}: UseDashboardDataOptions<T>): UseDashboardDataReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs to prevent callback recreation
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const fetchData = useCallback(async (bypassCache = false): Promise<void> => {
    if (!enabledRef.current) return;

    if (bypassCache) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError(null);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        cache: bypassCache ? "no-store" : "default",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      setData(result);
    } catch (err) {
      console.error(`Failed to fetch data from ${apiUrl}:`, err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [apiUrl]);

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    isRefreshing,
    fetch: fetchData,
    refresh,
  };
}

/**
 * Extended hook with additional parameters for API requests
 */
interface UseDashboardDataWithParamsOptions<T, P> extends UseDashboardDataOptions<T> {
  getParams?: () => P;
}

interface UseDashboardDataWithParamsReturn<T, P> extends UseDashboardDataReturn<T> {
  fetchWithParams: (params: Partial<P>, bypassCache?: boolean) => Promise<void>;
}

export function useDashboardDataWithParams<
  T = unknown,
  P extends Record<string, unknown> = Record<string, unknown>,
>({
  apiUrl,
  getParams,
  ttl = 5 * 60 * 1000,
  enabled = true,
}: UseDashboardDataWithParamsOptions<T, P>): UseDashboardDataWithParamsReturn<T, P> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs to prevent callback recreation
  const paramsRef = useRef<P | undefined>(getParams?.());
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Update params ref when getParams changes
  useEffect(() => {
    paramsRef.current = getParams?.();
  }, [getParams]);

  const fetchData = useCallback(
    async (overrideParams: Partial<P> = {}, bypassCache = false): Promise<void> => {
      if (!enabledRef.current) return;

      if (bypassCache) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        setError(null);
        const bodyParams = {
          ...paramsRef.current,
          ...overrideParams,
        };

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyParams),
          cache: bypassCache ? "no-store" : "default",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.error) {
          throw new Error(result.error);
        }

        setData(result);
      } catch (err) {
        console.error(`Failed to fetch data from ${apiUrl}:`, err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [apiUrl]
  );

  const refresh = useCallback(async () => {
    await fetchData({}, true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    isRefreshing,
    fetch: (bypassCache?: boolean) => fetchData({}, bypassCache),
    fetchWithParams: fetchData,
    refresh,
  };
}
