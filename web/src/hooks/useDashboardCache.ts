import { useState, useCallback } from "react";

const CACHE_KEY = "dashboard_cache";
const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day (24 hours)

interface CacheData<T> {
  data: T;
  timestamp: number;
}

interface UseDashboardCacheOptions {
  ttl?: number;
}

interface UseDashboardCacheReturn<T> {
  getCachedData: () => T | null;
  setCachedData: (data: T) => void;
  isCacheValid: () => boolean;
  clearCache: () => void;
  getLastRefreshTime: () => Date | null;
}

export function useDashboardCache<T = unknown>({
  ttl = DEFAULT_CACHE_TTL,
}: UseDashboardCacheOptions = {}): UseDashboardCacheReturn<T> {
  const [, setCacheBuster] = useState(0);

  const getCachedData = useCallback((): T | null => {
    if (typeof window === "undefined") return null;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const parsed: CacheData<T> = JSON.parse(cached);
      return parsed.data;
    } catch {
      return null;
    }
  }, []);

  const setCachedData = useCallback((data: T) => {
    if (typeof window === "undefined") return;

    try {
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      // Trigger re-render for components that depend on cache state
      setCacheBuster((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to cache dashboard data:", error);
    }
  }, []);

  const isCacheValid = useCallback((): boolean => {
    if (typeof window === "undefined") return false;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return false;

      const parsed: CacheData<T> = JSON.parse(cached);
      const now = Date.now();
      return now - parsed.timestamp < ttl;
    } catch {
      return false;
    }
  }, [ttl]);

  const clearCache = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(CACHE_KEY);
      setCacheBuster((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to clear dashboard cache:", error);
    }
  }, []);

  const getLastRefreshTime = useCallback((): Date | null => {
    if (typeof window === "undefined") return null;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const parsed: CacheData<T> = JSON.parse(cached);
      return new Date(parsed.timestamp);
    } catch {
      return null;
    }
  }, []);

  return {
    getCachedData,
    setCachedData,
    isCacheValid,
    clearCache,
    getLastRefreshTime,
  };
}
