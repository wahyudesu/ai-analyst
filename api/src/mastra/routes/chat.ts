import { registerApiRoute } from "@mastra/core/server"
import { Mastra } from "@mastra/core/mastra"

// Get Mastra instance - will be initialized at runtime
let mastraInstance: Mastra | null = null

function getMastra(): Mastra {
  if (!mastraInstance) {
    // Dynamic import to avoid circular dependency
    return import("../index").then(m => {
      mastraInstance = m.mastra
      return m.mastra
    })
  }
  return Promise.resolve(mastraInstance)
}

/**
 * Custom chat route that handles agent communication with streaming
 * Supports dynamic agent selection via URL parameter
 */
export const chatRoute = registerApiRoute("/chat/:agentId", {
  method: "POST",
  handler: async (c) => {
    const agentId = c.req.param("agentId")
    const body = await c.req.json().catch(() => ({}))
    const { messages = [], memory } = body

    if (!agentId) {
      return c.json({ error: "agentId is required" }, 400)
    }

    try {
      const mastra = await getMastra()
      const agent = mastra.getAgent(agentId)

      if (!agent) {
        return c.json({ error: `Agent "${agentId}" not found` }, 404)
      }

      // Stream the agent's response
      const stream = await agent.stream({
        messages,
        ...(memory && { memory }),
      })

      // Return the stream as SSE
      return c.newResponse(stream.toDataStream(), {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    } catch (error) {
      console.error("Chat route error:", error)
      return c.json(
        {
          error: "Failed to process chat request",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      )
    }
  },
})
