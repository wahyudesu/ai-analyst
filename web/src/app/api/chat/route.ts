import { NextRequest } from "next/server";

const MASTRA_URL = process.env.MASTRA_URL || "http://localhost:4111";

/**
 * Chat API route that proxies to Mastra's AI SDK-compatible chat endpoint
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId") || "testingAgent";

  const body = await req.json();
  const { databaseUrl, ...restBody } = body;
  const targetUrl = `${MASTRA_URL}/chat/${agentId}`;

  try {
    const requestBody: Record<string, unknown> = {
      ...restBody,
      messages: body.messages ?? [],
    };

    // Include databaseUrl if provided
    if (databaseUrl) {
      requestBody.databaseUrl = databaseUrl;
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(errorText, { status: response.status });
    }

    // Stream the response back to the client
    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to connect to Mastra server" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
