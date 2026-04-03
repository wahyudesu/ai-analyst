/**
 * Processing step definitions for AI Agent workflow
 */

export enum ProcessingStep {
  // Connection steps
  CONNECTING = "Connecting to database...",

  // Schema exploration steps
  EXPLORING_SCHEMA = "Exploring database schema...",
  LOADING_TABLE_INFO = "Loading table information...",

  // Query generation steps
  ANALYZING_REQUEST = "Analyzing your request...",
  PLANNING_QUERY = "Planning SQL query...",
  GENERATING_QUERY = "Generating SQL query...",

  // Query execution steps
  VALIDATING_QUERY = "Validating query...",
  EXECUTING_QUERY = "Executing query...",
  FETCHING_RESULTS = "Fetching results...",

  // Analysis steps
  ANALYZING_RESULTS = "Analyzing results...",
  DETECTING_PATTERNS = "Detecting patterns...",

  // Visualization steps
  PREPARING_CHART = "Preparing chart...",
  GENERATING_CHART = "Generating chart...",
  RENDERING_VISUALIZATION = "Rendering visualization...",

  // Generic steps
  THINKING = "Thinking...",
  PROCESSING = "Processing...",
}

export interface ProgressState {
  step: ProcessingStep
  progress: number // 0-1
  message?: string
}

/**
 * Map agent tool calls to processing steps
 */
export function getStepForTool(toolName: string): ProcessingStep {
  const stepMap: Record<string, ProcessingStep> = {
    "get-schema": ProcessingStep.EXPLORING_SCHEMA,
    "get-table": ProcessingStep.LOADING_TABLE_INFO,
    "execute-sql": ProcessingStep.EXECUTING_QUERY,
    "generate-chart": ProcessingStep.GENERATING_CHART,
    "suggest-charts": ProcessingStep.ANALYZING_RESULTS,
    "generate-multiple-charts": ProcessingStep.PREPARING_CHART,
  }

  return stepMap[toolName] || ProcessingStep.PROCESSING
}

/**
 * Format progress message for display
 */
export function formatProgress(step: ProcessingStep, details?: string): string {
  if (details) {
    return `${step} - ${details}`
  }
  return step
}
