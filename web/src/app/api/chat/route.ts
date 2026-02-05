import { NextRequest } from 'next/server';

/**
 * Chat API route that proxies to Mastra's AI SDK-compatible chat endpoint
 * This allows the web frontend to use AI SDK's useChat hook with Mastra agents
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get('agentId') || 'data-analyst';

  // Forward request to Mastra server
  const mastraUrl = process.env.MASTRA_URL || 'http://localhost:4111';
  const targetUrl = `${mastraUrl}/chat/${agentId}`;

  const body = await req.json();

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(errorText, { status: response.status });
    }

    // Stream the response back to the client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to connect to Mastra server' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
