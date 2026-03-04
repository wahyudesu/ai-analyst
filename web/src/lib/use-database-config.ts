/**
 * useDatabaseConfig Hook
 *
 * Custom hook for managing database configuration in localStorage.
 * Provides functions to get, set, and clear the database URL.
 */

import { useEffect, useState } from "react"

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
  const [databaseUrl, setDatabaseUrlState] = useState<string>("")
  const [databaseProvider, setDatabaseProviderState] = useState<DatabaseProvider>("postgres")
  const [isMounted, setIsMounted] = useState(false)

  // Initialize state from localStorage after component mounts
  useEffect(() => {
    setIsMounted(true)
    const storedUrl = localStorage.getItem(URL_STORAGE_KEY) || ""
    const storedProvider = (localStorage.getItem(PROVIDER_STORAGE_KEY) as DatabaseProvider) || "postgres"
    setDatabaseUrlState(storedUrl)
    setDatabaseProviderState(storedProvider)
  }, [])

  /**
   * Set/save a new database URL to localStorage
   */
  function setDatabaseUrl(url: string): void {
    if (typeof window === "undefined") return

    if (url) {
      localStorage.setItem(URL_STORAGE_KEY, url)
    } else {
      localStorage.removeItem(URL_STORAGE_KEY)
    }

    // Update state if component is mounted
    if (isMounted) {
      setDatabaseUrlState(url)
    }
  }

  /**
   * Set/save a new database provider to localStorage
   */
  function setDatabaseProvider(provider: DatabaseProvider): void {
    if (typeof window === "undefined") return

    localStorage.setItem(PROVIDER_STORAGE_KEY, provider)

    // Update state if component is mounted
    if (isMounted) {
      setDatabaseProviderState(provider)
    }
  }

  /**
   * Clear the database URL from localStorage
   */
  function clearDatabaseUrl(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(URL_STORAGE_KEY)
    localStorage.removeItem(PROVIDER_STORAGE_KEY)

    // Update state if component is mounted
    if (isMounted) {
      setDatabaseUrlState("")
      setDatabaseProviderState("postgres")
    }
  }

  return {
    databaseUrl,
    databaseProvider,
    setDatabaseUrl,
    setDatabaseProvider,
    clearDatabaseUrl,
  }
}
