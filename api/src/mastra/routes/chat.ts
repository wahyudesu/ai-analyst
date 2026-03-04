import { registerApiRoute } from "@mastra/core/server";
import { handleChatStream } from "@mastra/ai-sdk";
import { withRequestContext, setRequestContext } from "../lib/request-context.js";

// Import mastra instance lazily to avoid circular dependency
const getMastra = () => {
  // Dynamic import to avoid circular dependency
  return import("../index").then((m) => m.mastra);
};

/**
 * Custom chat route that supports dynamic model selection
 * Extends the default chatRoute to allow modelId parameter
 *
 * SECURITY: databaseUrl is stored in AsyncLocalStorage context,
 * NOT exposed to LLM in conversation history
 */
export const customChatRoute = registerApiRoute("/chat/:agentId", {
  method: "POST",
  handler: async (c) => {
    const agentId = c.req.param("agentId");
    const body = await c.req.json();

    const { modelId, databaseUrl, ...restBody } = body;

    // Wrap the entire request handling in secure context
    return withRequestContext({ databaseUrl }, async () => {
      // Get mastra instance
      const mastra = await getMastra();

      // Prepare the request context with modelId if provided
      const requestContext = modelId
        ? {
            model: {
              id: modelId,
            },
          }
        : undefined;

      // Prepare params - NO databaseUrl in messages (security)
      const params = {
        ...restBody,
        messages: body.messages ?? [],
        // Add request context if modelId is provided
        ...(requestContext && { requestContext }),
      };

      try {
        // Use Mastra's handleChatStream for AI SDK-compatible streaming
        const stream = await handleChatStream({
          mastra,
          agentId,
          params,
        });

        // Return the stream as a response
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } catch (error) {
        console.error("Chat API error:", error);
        return c.json(
          { error: "Failed to process chat request" },
          500
        );
      }
    });
  },
});
