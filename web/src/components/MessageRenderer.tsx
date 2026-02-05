'use client';

import { ChartRenderer } from './charts';
import type { ChartConfig } from './charts/types';
import { useMemo } from 'react';

interface MessageRendererProps {
  message: {
    role: string;
    content?: string;
    parts?: Array<{
      type: string;
      text?: string;
      toolName?: string;
      toolCallId?: string;
      args?: string;
      result?: any;
    }>;
  };
}

/**
 * Renders different types of messages from the AI agent
 * Supports text, tool calls, and chart visualizations
 */
export function MessageRenderer({ message }: MessageRendererProps) {
  const isUser = message.role === 'user';

  // Extract chart configuration from tool results
  const chartConfig = useMemo(() => {
    if (!message.parts) return null;

    for (const part of message.parts) {
      if (part.type === 'tool-result' && part.result) {
        // Check if result contains chart configuration
        if (part.result.chartType && part.result.data) {
          return part.result as ChartConfig;
        }
      }
    }

    return null;
  }, [message.parts]);

  // Format content for display
  const formatContent = (content: string) => {
    // Simple markdown-like formatting
    return content
      .replace(/```sql\n([\s\S]*?)```/g, '<pre class="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg overflow-x-auto my-2"><code class="text-sm">$1</code></pre>')
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg overflow-x-auto my-2"><code class="text-sm">$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-zinc-100 dark:bg-zinc-800 px-1 rounded text-sm">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  // Get text content from parts
  const getTextContent = () => {
    if (message.content) return message.content;
    if (message.parts) {
      return message.parts
        .filter((p) => p.type === 'text')
        .map((p) => p.text || '')
        .join('');
    }
    return '';
  };

  const textContent = getTextContent();

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-5xl rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'
        }`}
      >
        {/* Text content */}
        {textContent && (
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: formatContent(textContent) }}
          />
        )}

        {/* Tool call info */}
        {message.parts && message.parts.some((p) => p.type === 'tool-call') && !isUser && (
          <div className="mt-2 space-y-2">
            {message.parts
              .filter((p) => p.type === 'tool-call')
              .map((part, index) => (
                <div
                  key={index}
                  className="text-xs bg-zinc-200 dark:bg-zinc-700 px-2 py-1 rounded"
                >
                  <span className="font-mono">{part.toolName}</span>
                  {part.args && (
                    <span className="text-zinc-600 dark:text-zinc-400 ml-2">
                      {String(part.args).slice(0, 50)}...
                    </span>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Chart rendering */}
        {chartConfig && !isUser && (
          <div className="mt-4 bg-white dark:bg-zinc-900 rounded-lg p-4">
            <ChartRenderer config={chartConfig} />
          </div>
        )}
      </div>
    </div>
  );
}
