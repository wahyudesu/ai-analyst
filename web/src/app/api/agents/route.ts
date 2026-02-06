import { NextResponse } from 'next/server';
import { mastraClient } from '@/lib/mastra-client';

/**
 * Get available agents from Mastra server
 */
export async function GET() {
  try {
    const agentsMap = await mastraClient.listAgents();

    // Convert map to array for easier consumption
    const agents = Object.entries(agentsMap).map(([id, agent]) => ({
      id,
      name: agent.name,
      description: agent.description,
    }));

    return NextResponse.json(agents);
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents from Mastra server' },
      { status: 500 }
    );
  }
}
