import type { NextRequest } from "next/server"

// Use NEXT_PUBLIC_MASTRA_URL for client-side accessible config
// The API route runs server-side, so we can use MASTRA_URL directly
const MASTRA_URL = process.env.MASTRA_URL || process.env.NEXT_PUBLIC_MASTRA_URL || "http://localhost:4111"

/**
 * Chat API route that proxies to Mastra's AI SDK-compatible chat endpoint
 * Mastra returns JSON, we convert it to stream format for AI SDK compatibility
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get("agentId") || "data-analyst"

  const body = await req.json()
  const { databaseUrl, modelId, ...restBody } = body
  const targetUrl = `${MASTRA_URL}/api/agents/${agentId}/generate`

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
      return new Response(errorText, { status: response.status })
    }

    // Mastra returns JSON with structure: { text: string, usage: object, steps: array }
    // Convert to AI SDK stream format
    const data = await response.json()
    const text = data.text || ""

    // Create a ReadableStream that mimics AI SDK streaming format
    const stream = new ReadableStream({
      start(controller) {
        // Send the text in chunks to simulate streaming
        const chunk = `0:"${escapeText(text)}"\n\n`
        controller.enqueue(new TextEncoder().encode(chunk))

        // Send the done message
        controller.enqueue(new TextEncoder().encode("d\n\n"))
        controller.close()
      },
    })

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

/**
 * Escape special characters for AI SDK stream format
 */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/"/g, '\\"')    // Escape quotes
    .replace(/\n/g, '\\n')   // Escape newlines
    .replace(/\r/g, '\\r')   // Escape carriage returns
    .replace(/\t/g, '\\t')   // Escape tabs
}
