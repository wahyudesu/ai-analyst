'use client';

import { Chat } from '@/components/Chat';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

const AGENTS = [
  { id: 'data-analyst', name: 'Data Analyst', description: 'PostgreSQL with visualizations' },
  // { id: 'supabase-agent', name: 'Supabase Agent', description: 'Supabase/PostgreSQL via Composio' }, // Disabled: requires Composio connection
];

function ChatPage() {
  const searchParams = useSearchParams();
  const connectionString = searchParams.get('connection') || undefined;
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0].id);

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-4">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                AI Data Analyst
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Query your database with natural language and get visualizations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Agent Selector */}
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-0 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {AGENTS.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            {connectionString && (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                Connected
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Chat Interface */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full">
          <Chat key={selectedAgent} agentId={selectedAgent} connectionString={connectionString} />
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    }>
      <ChatPage />
    </Suspense>
  );
}
