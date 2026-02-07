import { NextResponse } from 'next/server';
import { mastraClient } from '@/lib/mastra-client';
import { retryWithBackoff } from '@/lib/api-utils';

/**
 * Get available agents from Mastra server
 */
async function fetchAgents(): Promise<Response> {
  const agentsMap = await mastraClient.listAgents();

  const agents = Object.entries(agentsMap).map(([id, agent]) => ({
    id,
    name: agent.name,
    description: agent.description,
  }));

  return NextResponse.json(agents);
}

export async function GET() {
  try {
    return await retryWithBackoff(fetchAgents, { retries: 3, delay: 1000 });
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    const isConnectionError =
      error instanceof Error &&
      (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed'));

    return NextResponse.json(
      { error: 'Failed to fetch agents from Mastra server', agents: [] },
      { status: isConnectionError ? 503 : 500 }
    );
  }
}
