import { NextRequest, NextResponse } from 'next/server';

const MASTRA_URL = process.env.MASTRA_URL || 'http://localhost:4111';

/**
 * API route to fetch message history for a thread
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get('threadId');
  const agentId = searchParams.get('agentId');
  const page = parseInt(searchParams.get('page') ?? '0');
  const perPage = parseInt(searchParams.get('perPage') ?? '100');

  if (!threadId) {
    return NextResponse.json({ error: 'threadId is required' }, { status: 400 });
  }

  try {
    const url = new URL(`${MASTRA_URL}/messages`);
    url.searchParams.set('threadId', threadId);
    if (agentId) url.searchParams.set('agentId', agentId);
    url.searchParams.set('page', page.toString());
    url.searchParams.set('perPage', perPage.toString());

    const response = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error('Mastra messages API error:', await response.text());
      return NextResponse.json(
        { error: 'Failed to fetch messages from Mastra server' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Messages API error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to Mastra server', messages: [] },
      { status: 500 }
    );
  }
}
