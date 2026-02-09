/**
 * useDatabaseConfig Hook
 *
 * Custom hook for managing database configuration in localStorage.
 * Provides functions to get, set, and clear the database URL.
 */

import { useEffect, useState } from "react"

const STORAGE_KEY = "database-url"

/**
 * Custom hook for managing database configuration
 *
 * @returns Object containing:
 *   - databaseUrl: The current database URL from localStorage
 *   - setDatabaseUrl: Function to save a new database URL
 *   - clearDatabaseUrl: Function to remove the database URL from localStorage
 */
export function useDatabaseConfig() {
  const [databaseUrl, setDatabaseUrlState] = useState<string>("")
  const [isMounted, setIsMounted] = useState(false)

  // Initialize state from localStorage after component mounts
  useEffect(() => {
    setIsMounted(true)
    const storedUrl = getDatabaseUrl()
    setDatabaseUrlState(storedUrl)
  }, [])

  /**
   * Get the current database URL from localStorage
   */
  function getDatabaseUrl(): string {
    if (typeof window === "undefined") return ""
    return localStorage.getItem(STORAGE_KEY) || ""
  }

  /**
   * Set/save a new database URL to localStorage
   */
  function setDatabaseUrl(url: string): void {
    if (typeof window === "undefined") return

    if (url) {
      localStorage.setItem(STORAGE_KEY, url)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }

    // Update state if component is mounted
    if (isMounted) {
      setDatabaseUrlState(url)
    }
  }

  /**
   * Clear the database URL from localStorage
   */
  function clearDatabaseUrl(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(STORAGE_KEY)

    // Update state if component is mounted
    if (isMounted) {
      setDatabaseUrlState("")
    }
  }

  return {
    databaseUrl,
    setDatabaseUrl,
    clearDatabaseUrl,
  }
}
