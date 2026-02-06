import { Agent } from "@mastra/core/agent";
import { TESTING_AGENT_INSTRUCTIONS } from "./prompt/prompt-testing";

/**
 * Simple Testing Agent for testing AI SDK UI integration
 * Uses zai-coding-plan/glm-4.5 model
 */
export const testingAgent = new Agent({
  id: "testing-agent",
  name: "Testing Agent",
  description: "Simple testing agent for AI SDK UI integration testing",
  instructions: TESTING_AGENT_INSTRUCTIONS,
  model: "zai-coding-plan/glm-4.5",
});
