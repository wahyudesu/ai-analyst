/**
 * Models API Routes
 * Provides available model information to the frontend
 */

import { registerApiRoute } from "@mastra/core/server";
import {
  getFrontendModels,
  DEFAULT_MODEL_ID,
  isValidModel,
} from "../config/models.js";

/**
 * GET /api/models
 * Returns list of available models
 */
export const modelsRoute = registerApiRoute("/models", {
  method: "GET",
  handler: async (c) => {
    return c.json({
      models: getFrontendModels(),
      default: DEFAULT_MODEL_ID,
    });
  },
});

/**
 * GET /api/models/:modelId
 * Check if a specific model is available
 */
export const modelCheckRoute = registerApiRoute("/models/:modelId", {
  method: "GET",
  handler: async (c) => {
    const modelId = c.req.param("modelId");

    if (!modelId) {
      return c.json({ valid: false, error: "modelId is required" }, 400);
    }

    const valid = isValidModel(modelId);

    return c.json({
      valid,
      modelId,
      available: valid,
    });
  },
});
