/**
 * API client for models endpoint
 */

export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
}

export interface ModelsResponse {
  models: ModelConfig[];
  default: string;
}

/**
 * Fetch available models from the API
 */
export async function fetchModels(): Promise<ModelsResponse> {
  const response = await fetch('/api/models');
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }
  return response.json();
}

/**
 * Check if a model ID is valid
 */
export async function checkModel(modelId: string): Promise<{ valid: boolean; available: boolean }> {
  const response = await fetch(`/api/models/${encodeURIComponent(modelId)}`);
  if (!response.ok) {
    return { valid: false, available: false };
  }
  return response.json();
}
