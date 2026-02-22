"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Database, ChartBar, ChevronDown, Send, Sparkles } from "lucide-react";

import { MessageRenderer } from "@/components/MessageRenderer";
import { threadsClient } from "@/lib/threads-client";
import { useDatabaseConfig } from "@/lib/use-database-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatContentProps {
  agentId?: string;
  connectionString?: string;
  className?: string;
}

interface Agent {
  id: string;
  name: string;
  description?: string;
}

interface ModelOption {
  id: string;
  name: string;
  provider: "zai" | "openai";
}

// Constants
const DEFAULT_AGENT_ID = "data-analyst";

// Model options
const MODEL_OPTIONS: ModelOption[] = [
  { id: "zai-coding-plan/glm-4.5", name: "GLM 4.5", provider: "zai" },
  { id: "zai-coding-plan/glm-4.5-flash", name: "GLM 4.5 Flash", provider: "zai" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "openai" },
];

const DEFAULT_MODEL_ID = MODEL_OPTIONS[0].id;

// Agent icons mapping
const AGENT_ICONS: Record<string, React.ElementType> = {
  "data-analyst": Database,
  "chart-agent": ChartBar,
  "supabase-agent": Database,
} as const;

function getAgentIcon(agentId?: string): React.ElementType {
  return AGENT_ICONS[agentId || DEFAULT_AGENT_ID] || Database;
}

export function ChatContent({
  agentId: propAgentId,
  connectionString,
  className,
}: ChatContentProps) {
  const [input, setInput] = useState("");
  const [currentAgentId, setCurrentAgentId] = useState<string>(DEFAULT_AGENT_ID);
  const [currentModelId, setCurrentModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { databaseUrl } = useDatabaseConfig();

  const threadIdRef = useRef<string>(threadsClient.getOrCreateThreadId());
  const threadId = threadIdRef.current;
  const resourceId = threadsClient.getResourceId();

  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  // Fetch all agents on mount
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch("/api/agents");
        if (response.ok) {
          const agents: Agent[] = await response.json();
          setAllAgents(agents);
        }
      } catch (error) {
        console.error("Failed to fetch agents:", error);
      }
    };
    fetchAgents();
  }, []);

  const transportParamsRef = useRef({
    agentId: currentAgentId,
    modelId: currentModelId,
    threadId,
    resourceId,
    databaseUrl,
  });

  transportParamsRef.current = {
    agentId: currentAgentId,
    modelId: currentModelId,
    threadId,
    resourceId,
    databaseUrl,
  };

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat?agentId=${currentAgentId}`,
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            memory: {
              thread: { id: transportParamsRef.current.threadId },
              ...(transportParamsRef.current.resourceId && {
                resource: transportParamsRef.current.resourceId,
              }),
            },
            ...(transportParamsRef.current.databaseUrl && {
              databaseUrl: transportParamsRef.current.databaseUrl,
            }),
            ...(transportParamsRef.current.modelId && {
              modelId: transportParamsRef.current.modelId,
            }),
          },
        }),
      }),
    [currentAgentId, currentModelId],
  );

  const { messages, status, sendMessage, error, setMessages } = useChat({
    transport,
  });

  const isLoading = status === "streaming" || status === "submitted";

  const currentAgentInfo = useMemo(
    () => allAgents.find((a) => a.id === currentAgentId) || null,
    [allAgents, currentAgentId],
  );

  const lastFetchRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const fetchKey = `${threadId}-${currentAgentId}`;

    if (lastFetchRef.current === fetchKey) return;
    if (!threadId || !currentAgentId) return;

    const fetchMessageHistory = async () => {
      try {
        const response = await fetch(
          `/api/chat/messages?threadId=${threadId}&agentId=${currentAgentId}`,
        );
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          }
        }
      } catch (error) {
        console.error("Failed to fetch message history:", error);
      }
    };

    fetchMessageHistory();
    lastFetchRef.current = fetchKey;
  }, [currentAgentId, threadId, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startNewChat = useCallback((agentId?: string) => {
    const agentToUse = agentId || DEFAULT_AGENT_ID;
    threadsClient.clearCurrentThreadId();
    const newThreadId = threadsClient.getOrCreateThreadId();
    threadIdRef.current = newThreadId;
    setCurrentAgentId(agentToUse);
    setMessages([]);
    setInput("");
    setCurrentModelId(DEFAULT_MODEL_ID);
  }, [setMessages]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  const AgentIcon = useMemo(
    () => getAgentIcon(currentAgentId),
    [currentAgentId],
  );

  return (
    <div className={`flex flex-col h-full ${className || ""}`}>
      {/* Agent Selector Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Sparkles className="w-4 h-4" />
              <span>{currentAgentInfo?.name || "AI Analyst"}</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {allAgents.map((agent) => {
              const Icon = getAgentIcon(agent.id);
              const isSelected = agent.id === currentAgentId;
              return (
                <DropdownMenuItem
                  key={agent.id}
                  onClick={() => {
                    setCurrentAgentId(agent.id);
                    startNewChat(agent.id);
                  }}
                  className="cursor-pointer"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <div className="flex flex-col">
                    <span className="font-medium">{agent.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {agent.description}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          onClick={() => startNewChat()}
        >
          New Chat
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="max-w-md">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AgentIcon className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {currentAgentInfo?.name || "AI Analyst"}
              </h2>
              <p className="text-muted-foreground">
                {currentAgentInfo?.description ||
                  "Ask questions about your data and get insights with visualizations."}
              </p>
              <p className="text-xs text-muted-foreground mt-4">
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
                sessionId={threadId}
              />
            ))}
            {error && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                Error: {error.message}
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="p-4 border-t border-border bg-card">
        <div className="flex gap-2 items-center max-w-4xl mx-auto">
          <DropdownMenu open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="px-3 py-2 text-sm border border-input rounded-lg bg-background hover:bg-accent transition-colors flex items-center gap-2 min-w-[120px] justify-between"
                disabled={isLoading}
              >
                <span className="truncate">
                  {MODEL_OPTIONS.find(m => m.id === currentModelId)?.name || "Model"}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${modelSelectorOpen ? "rotate-180" : ""}`} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {MODEL_OPTIONS.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  onClick={() => setCurrentModelId(model.id)}
                  className={`cursor-pointer ${currentModelId === model.id ? "bg-accent" : ""}`}
                >
                  <span className="flex-1">{model.name}</span>
                  {currentModelId === model.id && (
                    <div className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your data..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
