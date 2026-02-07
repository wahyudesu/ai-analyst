'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Database, ChartBar, ChevronDown, Menu, X, Plus } from 'lucide-react';

import { MessageRenderer } from './MessageRenderer';
import { threadsClient } from '@/lib/threads-client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  messageCount?: number;
  agentId?: string;
}

// Constants
const DEFAULT_AGENT_ID = 'data-analyst';

// Agent icons mapping - stable outside component
const AGENT_ICONS: Record<string, React.ElementType> = {
  'data-analyst': Database,
  'chart-agent': ChartBar,
  'supabase-agent': Database,
} as const;

function getAgentIcon(agentId?: string): React.ElementType {
  return AGENT_ICONS[agentId || DEFAULT_AGENT_ID] || Database;
}

export function Chat({ agentId: propAgentId, connectionString, className }: ChatProps) {
  const [input, setInput] = useState('');
  const [currentAgentId, setCurrentAgentId] = useState<string>(DEFAULT_AGENT_ID);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Session management
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    sessionId: string | null;
    sessionTitle: string;
  }>({
    isOpen: false,
    sessionId: null,
    sessionTitle: '',
  });

  // Get or create thread ID for session management
  const threadIdRef = useRef<string>(threadsClient.getOrCreateThreadId());
  const threadId = threadIdRef.current;

  const resourceId = threadsClient.getResourceId();

  // Fetch all agents on mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/agents');
        if (response.ok) {
          const agents: Agent[] = await response.json();
          setAllAgents(agents);
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      }
    };
    fetchAgents();
  }, []);

  // Memoize transport to prevent useChat from re-initializing
  // Use a ref to track current values without triggering re-creation
  const transportParamsRef = useRef({
    agentId: currentAgentId,
    threadId,
    resourceId,
  });

  // Update ref when values change (doesn't trigger re-render)
  transportParamsRef.current = {
    agentId: currentAgentId,
    threadId,
    resourceId,
  };

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: `/api/chat?agentId=${currentAgentId}`,
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          messages,
          memory: {
            thread: { id: transportParamsRef.current.threadId },
            ...(transportParamsRef.current.resourceId && { resource: transportParamsRef.current.resourceId }),
          },
        },
      }),
    }),
    [currentAgentId],
  );

  const { messages, status, sendMessage, error, setMessages } = useChat({
    transport,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Get current agent info
  const currentAgentInfo = useMemo(
    () => allAgents.find(a => a.id === currentAgentId) || null,
    [allAgents, currentAgentId]
  );

  // Title update ref - must be before other hooks
  const titleUpdateRef = useRef<string | undefined>(undefined);

  // Helper functions - declared early, stable dependencies
  const saveSessions = useCallback((updatedSessions: ChatSession[]) => {
    localStorage.setItem('chat-sessions', JSON.stringify(updatedSessions));
  }, []);

  // Initialize session - run once on mount
  useEffect(() => {
    const loadSessions = () => {
      const stored = localStorage.getItem('chat-sessions');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSessions(parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt)
        })));
      }
    };

    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set current session ID from thread only on first mount
  const isInitializedRef = useRef(false);
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      setCurrentSessionId(threadId);
    }
  }, [threadId]);

  // Track last fetched combination to avoid duplicate fetches
  const lastFetchRef = useRef<string | undefined>(undefined);

  // Fetch message history - only when threadId or agentId changes
  useEffect(() => {
    const fetchKey = `${threadId}-${currentAgentId}`;

    // Skip if we already fetched this combination
    if (lastFetchRef.current === fetchKey) return;
    if (!threadId || !currentAgentId) return;

    const fetchMessageHistory = async () => {
      setIsLoadingMessages(true);
      try {
        const response = await fetch(
          `/api/chat/messages?threadId=${threadId}&agentId=${currentAgentId}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          }
        }
      } catch (error) {
        console.error('Failed to fetch message history:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessageHistory();
    lastFetchRef.current = fetchKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAgentId, threadId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Update session title - with proper guard
  // Use ref for currentAgentId to avoid re-running this effect when agent changes
  const agentIdRef = useRef(currentAgentId);
  agentIdRef.current = currentAgentId;

  useEffect(() => {
    // Only update title if we haven't already for this session
    if (messages.length > 0 && currentSessionId) {
      if (titleUpdateRef.current === currentSessionId) return;

      const firstUserMessage = messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        const content = firstUserMessage.parts?.find(p => p.type === 'text')?.text ||
                       (firstUserMessage as any).content ||
                       'New Chat';
        const title = String(content).slice(0, 50);

        // Use functional update to avoid dependency on sessions
        setSessions(prev => {
          // Check if session already exists with this title to avoid update
          const existing = prev.find(s => s.id === currentSessionId);
          if (existing && existing.title === title) {
            // Still mark as updated to prevent re-checking
            return prev;
          }

          let updated;
          if (existing) {
            updated = prev.map(s =>
              s.id === currentSessionId ? { ...s, title } : s
            );
          } else {
            const newSession: ChatSession = {
              id: currentSessionId,
              title: title || 'New Chat',
              createdAt: new Date(),
              agentId: agentIdRef.current || DEFAULT_AGENT_ID,
            };
            updated = [newSession, ...prev];
          }

          // Save to localStorage directly to avoid dependency on saveSessions callback
          localStorage.setItem('chat-sessions', JSON.stringify(updated));
          return updated;
        });

        titleUpdateRef.current = currentSessionId;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentSessionId]);

  // Other callbacks
  const startNewChat = useCallback((agentId?: string) => {
    const agentToUse = agentId || DEFAULT_AGENT_ID;

    threadsClient.clearCurrentThreadId();
    const newThreadId = threadsClient.getOrCreateThreadId();
    threadIdRef.current = newThreadId;
    setCurrentSessionId(newThreadId);
    setCurrentAgentId(agentToUse);
    setMessages([]);
    setInput('');
    titleUpdateRef.current = undefined;
    setIsSidebarOpen(false);
  }, []);

  const switchSession = useCallback(async (sessionId: string, sessionAgentId?: string) => {
    threadsClient.setCurrentThreadId(sessionId);
    threadIdRef.current = sessionId;
    setCurrentSessionId(sessionId);

    const agentToUse = sessionAgentId || DEFAULT_AGENT_ID;
    setCurrentAgentId(agentToUse);

    setIsLoadingMessages(true);
    try {
      const response = await fetch(
        `/api/chat/messages?threadId=${sessionId}&agentId=${agentToUse}`
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to fetch message history:', error);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
    titleUpdateRef.current = undefined;
  }, []);

  const confirmDeleteSession = useCallback((sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Find session from current state (not from dependency)
    setDeleteDialog(prev => {
      const session = sessions.find(s => s.id === sessionId);
      return {
        isOpen: true,
        sessionId,
        sessionTitle: session?.title || 'This chat',
      };
    });
  }, [sessions]);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      saveSessions(updated);
      return updated;
    });

    if (sessionId === currentSessionId) {
      // Start new chat with default agent when current session is deleted
      startNewChat(DEFAULT_AGENT_ID);
    }

    // Close dialog
    setDeleteDialog({ isOpen: false, sessionId: null, sessionTitle: '' });
  }, [currentSessionId, saveSessions, startNewChat]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  // Current agent icon (memoized)
  const AgentIcon = useMemo(() => getAgentIcon(currentAgentId), [currentAgentId]);

  return (
    <div className={`flex h-full ${className || ''}`}>
      {/* Sidebar Toggle Button (Mobile) */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Sidebar - Chat History */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-40
        w-72 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800
        transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full p-4">
          {/* New Chat with Agent Selection */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full justify-start bg-orange-600 text-white hover:bg-orange-700 transition-colors mb-4">
                <Plus className="w-5 h-5 mr-2" />
                <span className="font-medium">New Chat</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {allAgents.map((agent) => {
                const Icon = getAgentIcon(agent.id);
                const isSelected = agent.id === currentAgentId;
                return (
                  <DropdownMenuItem
                    key={agent.id}
                    onClick={() => startNewChat(agent.id)}
                    className="cursor-pointer"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    <div className="flex flex-col">
                      <span className="font-medium">{agent.name}</span>
                      <span className="text-xs text-zinc-500">{agent.description}</span>
                    </div>
                    {isSelected && (
                      <div className="ml-auto">
                        <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      </div>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Recent Chats
            </h3>
            <div className="space-y-1">
              {sessions.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                  No chat history yet
                </p>
              ) : (
                sessions.map((session) => {
                  const SessionIcon = getAgentIcon(session.agentId);
                  return (
                    <div
                      key={session.id}
                      onClick={() => switchSession(session.id, session.agentId)}
                      className={`
                        group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors
                        ${currentSessionId === session.id
                          ? 'bg-orange-100 dark:bg-orange-900/30/30 text-orange-700 dark:text-orange-300'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }
                      `}
                    >
                      <SessionIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-sm truncate">{session.title}</span>
                      <button
                        onClick={(e) => confirmDeleteSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
                        aria-label="Delete chat"
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Thread Info */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
              <p>Thread: <span className="font-mono">{threadId.slice(0, 8)}...</span></p>
              <p>Resource: <span className="font-mono">{resourceId}</span></p>
            </div>
          </div>
        </div>

        {/* Close Sidebar Button (Mobile) */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div className="max-w-2xl">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AgentIcon className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                  {currentAgentInfo?.name || 'AI Agent'}
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {currentAgentInfo?.description || 'Start a conversation with the AI agent.'}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-4">
                  Session: {threadId}
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <MessageRenderer
                  key={message.id || index}
                  message={message as any}
                  agentInfo={currentAgentInfo}
                />
              ))}
              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
                  Error: {error.message}
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
          {(isLoading || isLoadingMessages) && (
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
              placeholder="Type a message..."
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-zinc-400 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.sessionTitle}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ isOpen: false, sessionId: null, sessionTitle: '' })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.sessionId && deleteSession(deleteDialog.sessionId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
