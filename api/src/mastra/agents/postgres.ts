import { Agent } from "@mastra/core/agent"
import {
  createAnswerRelevancyScorer,
  createCompletenessScorer,
  createFaithfulnessScorer,
  createToxicityScorer,
} from "@mastra/evals/scorers/prebuilt"
import { DEFAULT_MODEL_ID } from "../config/models.js"
import { dataAnalystMemory } from "../memory"
import { chartTools } from "../tools/charts"
import { postgresTools } from "../tools/postgres"
import { POSTGRES_DATA_ANALYST_INSTRUCTIONS } from "./prompt/prompt-postgres"

// Create a data analyst agent for PostgreSQL database with memory
export const sqlagent = new Agent({
  id: "data-analyst",
  name: "Data Analyst",
  description:
    "AI Data analyst specialized in querying, analyzing, and visualizing data stored in PostgreSQL databases",
  instructions: POSTGRES_DATA_ANALYST_INSTRUCTIONS,
  model: DEFAULT_MODEL_ID,
  tools: { ...postgresTools, ...chartTools },
  memory: dataAnalystMemory,
  scorers: {
    relevancy: {
      scorer: createAnswerRelevancyScorer({
        model: { id: "zai-coding-plan/glm-4.5" },
      }),
      sampling: { type: "ratio", rate: 0.5 },
    },
    safety: {
      scorer: createToxicityScorer({
        model: { id: "zai-coding-plan/glm-4.5" },
      }),
      sampling: { type: "ratio", rate: 1 },
    },
    // completeness: {
    //   scorer: createCompletenessScorer({ model: { id: "zai-coding-plan/glm-4.5" } }),
    //   sampling: { type: 'ratio', rate: 1 },
    // },
    faithfulness: {
      scorer: createFaithfulnessScorer({
        model: { id: "zai-coding-plan/glm-4.5" },
      }),
      sampling: { type: "ratio", rate: 1 },
    },
  },
})
