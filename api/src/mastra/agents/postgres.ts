import { Agent } from "@mastra/core/agent";
import { POSTGRES_DATA_ANALYST_INSTRUCTIONS } from "./prompt/prompt-postgres";
import { postgresTools } from "../tools/postgres";
import { chartTools } from "../tools/charts";
import { dataAnalystMemory } from "../memory";

// Create a data analyst agent for PostgreSQL database with memory
export const sqlagent = new Agent({
  id: "data-analyst",
  name: "Data Analyst",
  description:
    "AI Data analyst specialized in querying, analyzing, and visualizing data stored in PostgreSQL databases",
  instructions: POSTGRES_DATA_ANALYST_INSTRUCTIONS,
  // model: "openai/o4-mini",
  model: "zai-coding-plan/glm-4.5",
  tools: { ...postgresTools, ...chartTools },
  memory: dataAnalystMemory,
});
