/**
 * Mask PostgreSQL connection URL for security
 * Shows asterisks with the same length as the original URL
 *
 * @param url - The database connection URL to mask
 * @returns The masked URL string (same length as original with asterisks)
 */
export function maskDatabaseUrl(url: string): string {
  if (!url) return ""

  // Return asterisks with the same length as the original URL
  return "*".repeat(url.length)
}
