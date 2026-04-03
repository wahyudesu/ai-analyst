/**
 * Centralized Model Configuration
 *
 * All LLM model settings are defined here.
 * Update this file to change default models or add new ones.
 */

export interface ModelConfig {
  id: string
  name: string
  provider: "zai" | "openai" | "anthropic"
  enabled: boolean
}

export interface ModelRouting {
  simple: string // For simple tasks
  standard: string // For standard tasks (default)
  complex: string // For complex reasoning tasks
}

/**
 * Available models
 */
export const AVAILABLE_MODELS: Record<string, ModelConfig> = {
  // ZAI Models (primary - cost effective)
  "zai-coding-plan/glm-4.5": {
    id: "zai-coding-plan/glm-4.5",
    name: "ZAI GLM 4.5",
    provider: "zai",
    enabled: true,
  },
  "zai-coding-plan/glm-4.5-flash": {
    id: "zai-coding-plan/glm-4.5-flash",
    name: "ZAI GLM 4.5 Flash",
    provider: "zai",
    enabled: true,
  },

  // OpenAI Models (backup)
  "openai/gpt-4o-mini": {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    enabled: true,
  },
  "openai/gpt-4o": {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    enabled: true,
  },
  "openai/o1-mini": {
    id: "openai/o1-mini",
    name: "O1 Mini",
    provider: "openai",
    enabled: true,
  },
}

/**
 * Default model for agents
 * Can be overridden via DEFAULT_MODEL_ID env var
 */
export const DEFAULT_MODEL_ID =
  process.env.DEFAULT_MODEL_ID || "zai-coding-plan/glm-4.5"

/**
 * Model fallback chain
 * Used when primary model fails
 */
export const MODEL_FALLBACK = [
  "zai-coding-plan/glm-4.5",
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
]

/**
 * Task-based model routing
 * Agents can use this to select appropriate models
 */
export const MODEL_ROUTING: ModelRouting = {
  simple: "zai-coding-plan/glm-4.5-flash",
  standard: "zai-coding-plan/glm-4.5",
  complex: "openai/gpt-4o",
}

/**
 * Get model config by ID
 */
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return AVAILABLE_MODELS[modelId]
}

/**
 * Get enabled models for a provider
 */
export function getModelsByProvider(
  provider: "zai" | "openai" | "anthropic"
): ModelConfig[] {
  return Object.values(AVAILABLE_MODELS).filter(
    m => m.provider === provider && m.enabled
  )
}

/**
 * Get all enabled models
 */
export function getEnabledModels(): ModelConfig[] {
  return Object.values(AVAILABLE_MODELS).filter(m => m.enabled)
}

/**
 * Validate if a model ID is available and enabled
 */
export function isValidModel(modelId: string): boolean {
  const model = AVAILABLE_MODELS[modelId]
  return model?.enabled || false
}

/**
 * Get frontend-friendly model list
 * (excluding sensitive info)
 */
export function getFrontendModels(): Array<{
  id: string
  name: string
  provider: string
}> {
  return getEnabledModels().map(m => ({
    id: m.id,
    name: m.name,
    provider: m.provider,
  }))
}
