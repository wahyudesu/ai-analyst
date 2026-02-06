'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect } from 'react';
import { MessageRenderer } from './MessageRenderer';

interface ChatProps {
  agentId?: string;
  connectionString?: string;
  className?: string;
}

interface Agent {
  id: string;
  name: string;
  description?: string;
}

export function Chat({ agentId, connectionString, className }: ChatProps) {
  const [input, setInput] = useState('');
  const [currentAgentInfo, setCurrentAgentInfo] = useState<Agent | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get Mastra server URL from environment or default to localhost:4111
  const mastraUrl = process.env.NEXT_PUBLIC_MASTRA_URL || 'http://localhost:4111';

  const { messages, status, sendMessage, error } = useChat({
    transport: new DefaultChatTransport({
      api: `${mastraUrl}/chat/${agentId}`,
    }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Fetch current agent info
  useEffect(() => {
    const fetchAgentInfo = async () => {
      if (!agentId) return;
      try {
        const response = await fetch('/api/agents');
        if (response.ok) {
          const agents: Agent[] = await response.json();
          const agent = agents.find(a => a.id === agentId);
          if (agent) setCurrentAgentInfo(agent);
        }
      } catch (error) {
        console.error('Failed to fetch agent info:', error);
      }
    };
    fetchAgentInfo();
  }, [agentId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="max-w-2xl">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                {currentAgentInfo?.name || 'AI Agent'}
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                {currentAgentInfo?.description || 'Coba kirim pesan untuk testing streaming!'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <MessageRenderer key={message.id || index} message={message as any} />
            ))}
            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
                Error: {error.message}
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce delay-100" />
            <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce delay-200" />
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik pesan..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed"
          >
            Kirim
          </button>
        </div>
      </form>
    </div>
  );
}
