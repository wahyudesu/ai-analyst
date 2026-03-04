/**
 * Shared chart colors from Tailwind global CSS variables
 * All chart components should use these colors for consistency
 */

export const CHART_COLORS = [
  'var(--primary)',
  'var(--secondary)',
  'var(--accent)',
  'var(--chart-4)',
  'var(--chart-5)',
] as const;

/**
 * Get color for a series index
 */
export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}
