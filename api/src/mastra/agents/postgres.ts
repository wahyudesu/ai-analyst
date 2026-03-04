import { Agent } from "@mastra/core/agent";
import { POSTGRES_DATA_ANALYST_INSTRUCTIONS } from "./prompt/prompt-postgres";
import { postgresTools } from "../tools/postgres";
import { chartTools } from "../tools/charts";
import { dataAnalystMemory } from "../memory";
import { DEFAULT_MODEL_ID } from "../config/models.js";

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
});
