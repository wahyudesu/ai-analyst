/**
 * useDatabaseConfig Hook
 *
 * Custom hook for managing database configuration in localStorage.
 * Provides functions to get, set, and clear the database URL.
 */

import { useState } from "react"

const URL_STORAGE_KEY = "database-url"
const PROVIDER_STORAGE_KEY = "database-provider"

export type DatabaseProvider = "neon" | "supabase" | "postgres" | "other"

/**
 * Custom hook for managing database configuration
 *
 * @returns Object containing:
 *   - databaseUrl: The current database URL from localStorage
 *   - databaseProvider: The current database provider
 *   - setDatabaseUrl: Function to save a new database URL
 *   - setDatabaseProvider: Function to save a new database provider
 *   - clearDatabaseUrl: Function to remove the database URL and provider from localStorage
 */
export function useDatabaseConfig() {
  // Initialize state from localStorage synchronously to avoid timing issues
  // This ensures the value is available on first render, preventing race conditions
  const [databaseUrl, setDatabaseUrlState] = useState<string>(() => {
    if (typeof window === "undefined") return ""
    try {
      return localStorage.getItem(URL_STORAGE_KEY) || ""
    } catch {
      return ""
    }
  })

  const [databaseProvider, setDatabaseProviderState] =
    useState<DatabaseProvider>(() => {
      if (typeof window === "undefined") return "postgres"
      try {
        return (
          (localStorage.getItem(PROVIDER_STORAGE_KEY) as DatabaseProvider) ||
          "postgres"
        )
      } catch {
        return "postgres"
      }
    })

  /**
   * Set/save a new database URL to localStorage
   */
  function setDatabaseUrl(url: string): void {
    if (typeof window === "undefined") return

    try {
      if (url) {
        localStorage.setItem(URL_STORAGE_KEY, url)
      } else {
        localStorage.removeItem(URL_STORAGE_KEY)
      }
    } catch (e) {
      console.warn("Failed to save database URL to localStorage:", e)
    }

    // Always update state immediately
    setDatabaseUrlState(url)
  }

  /**
   * Set/save a new database provider to localStorage
   */
  function setDatabaseProvider(provider: DatabaseProvider): void {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem(PROVIDER_STORAGE_KEY, provider)
    } catch (e) {
      console.warn("Failed to save database provider to localStorage:", e)
    }

    // Always update state immediately
    setDatabaseProviderState(provider)
  }

  /**
   * Clear the database URL from localStorage
   */
  function clearDatabaseUrl(): void {
    if (typeof window === "undefined") return

    try {
      localStorage.removeItem(URL_STORAGE_KEY)
      localStorage.removeItem(PROVIDER_STORAGE_KEY)
    } catch (e) {
      console.warn("Failed to clear database config from localStorage:", e)
    }

    // Always update state immediately
    setDatabaseUrlState("")
    setDatabaseProviderState("postgres")
  }

  return {
    databaseUrl,
    databaseProvider,
    setDatabaseUrl,
    setDatabaseProvider,
    clearDatabaseUrl,
  }
}
