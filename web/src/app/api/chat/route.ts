import type { NextRequest } from "next/server"

// Use NEXT_PUBLIC_MASTRA_URL for client-side accessible config
// The API route runs server-side, so we can use MASTRA_URL directly
const MASTRA_URL = process.env.MASTRA_URL || process.env.NEXT_PUBLIC_MASTRA_URL || "http://localhost:4111"

/**
 * Chat API route that proxies to Mastra's streaming chat endpoint
 * Uses Mastra's handleChatStream for real AI SDK-compatible streaming
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get("agentId") || "data-analyst"

  const body = await req.json()
  const { databaseUrl, modelId, ...restBody } = body

  // Use Mastra's streaming endpoint
  // Note: Mastra v2 routes are at /chat/:agentId (not /api/chat/:agentId)
  const targetUrl = `${MASTRA_URL}/chat/${agentId}`

  try {
    const requestBody: Record<string, unknown> = {
      ...restBody,
      messages: body.messages ?? [],
    }

    // Include databaseUrl if provided
    if (databaseUrl) {
      requestBody.databaseUrl = databaseUrl
    }

    // Include modelId if provided
    if (modelId) {
      requestBody.modelId = modelId
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Mastra API error:", response.status, errorText)
      return new Response(errorText, { status: response.status })
    }

    // Proxy the stream directly from Mastra to the client
    // Mastra's handleChatStream returns AI SDK-compatible streaming format
    const stream = response.body

    if (!stream) {
      return new Response("No stream returned from Mastra", { status: 500 })
    }

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return new Response(
      JSON.stringify({ error: "Failed to connect to Mastra server" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
