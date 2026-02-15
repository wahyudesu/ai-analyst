import { registerApiRoute } from "@mastra/core/server";
import { handleChatStream } from "@mastra/ai-sdk";

// Import mastra instance lazily to avoid circular dependency
const getMastra = () => {
  // Dynamic import to avoid circular dependency
  return import("../index").then((m) => m.mastra);
};

/**
 * Custom chat route that supports dynamic model selection
 * Extends the default chatRoute to allow modelId parameter
 */
export const customChatRoute = registerApiRoute("/chat/:agentId", {
  method: "POST",
  handler: async (c) => {
    const agentId = c.req.param("agentId");
    const body = await c.req.json();

    const { modelId, databaseUrl, ...restBody } = body;

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

    // Prepare params with request context
    const params = {
      ...restBody,
      messages: body.messages ?? [],
      // Add databaseUrl to context if provided
      ...(databaseUrl && {
        context: [
          ...(body.context || []),
          {
            role: "system",
            content: `Database URL: ${databaseUrl}`,
          },
        ],
      }),
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
  },
});
