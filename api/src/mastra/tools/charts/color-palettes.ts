/**
 * Color palette definitions for charts
 */

import type { ColorScheme } from "./types.js"

/**
 * Default color palette - modern blue-purple gradient
 */
export const defaultPalette = [
  "#3b82f6", // Blue 500
  "#8b5cf6", // Violet 500
  "#06b6d4", // Cyan 500
  "#f59e0b", // Amber 500
  "#ef4444", // Red 500
  "#10b981", // Emerald 500
  "#f97316", // Orange 500
  "#6366f1", // Indigo 500
]

/**
 * Categorical color palette - distinct colors for categories
 */
export const categoricalPalette = [
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#10b981", // Green
  "#f59e0b", // Yellow/Orange
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#ec4899", // Pink
  "#6366f1", // Indigo
  "#14b8a6", // Teal
]

/**
 * Sequential color palette - single hue gradient
 */
export const sequentialPalette = [
  "#dbeafe", // Blue 100
  "#93c5fd", // Blue 300
  "#60a5fa", // Blue 400
  "#3b82f6", // Blue 500
  "#2563eb", // Blue 600
  "#1d4ed8", // Blue 700
  "#1e40af", // Blue 800
]

/**
 * Get color palette by scheme name
 */
export function getPalette(scheme: ColorScheme = "default"): string[] {
  switch (scheme) {
    case "categorical":
      return categoricalPalette
    case "sequential":
      return sequentialPalette
    default:
      return defaultPalette
  }
}

/**
 * Get color at index from palette, cycling if needed
 */
export function getColor(
  index: number,
  scheme: ColorScheme = "default",
  customColor?: string
): string {
  if (customColor) {
    return customColor
  }

  const palette = getPalette(scheme)
  return palette[index % palette.length]
}

/**
 * Generate opacity variant of a color
 */
export function colorWithOpacity(hex: string, opacity: number): string {
  // Remove hash if present
  const hexValue = hex.replace("#", "")

  // Parse RGB values
  const r = Number.parseInt(hexValue.substring(0, 2), 16)
  const g = Number.parseInt(hexValue.substring(2, 4), 16)
  const b = Number.parseInt(hexValue.substring(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}
