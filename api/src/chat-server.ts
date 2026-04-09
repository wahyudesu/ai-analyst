/**
 * Standalone Chat Server
 * Uses Hono to handle chat requests
 */
import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

// Import Mastra instance
import { mastra } from "./mastra/index.js"

const app = new Hono()

// Middleware
app.use("*", cors())
app.use("*", logger())

// Health check
app.get("/health", (c) => c.json({ status: "ok", port: 3000 }))

// Chat endpoint
app.post("/chat/:agentId", async (c) => {
  const agentId = c.req.param("agentId")
  const body = await c.req.json().catch(() => ({}))
  const { messages = [], memory } = body

  if (!agentId) {
    return c.json({ error: "agentId is required" }, 400)
  }

  try {
    const agent = mastra.getAgent(agentId)

    if (!agent) {
      return c.json({ error: `Agent "${agentId}" not found. Available agents: ${Object.keys(mastra.agents || {}).join(", ")}` }, 404)
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
})

// List available agents
app.get("/agents", (c) => {
  const agents = mastra.agents || {}
  const agentList = Object.entries(agents).map(([id, agent]) => ({
    id,
    name: agent.name,
    description: agent.description,
  }))
  return c.json({ agents: agentList })
})

const port = parseInt(process.env.CHAT_PORT || process.env.PORT || "3001")

console.log(`Chat server starting on port ${port}...`)

serve({
  fetch: app.fetch,
  port,
})

console.log(`Chat server running at http://localhost:${port}`)
