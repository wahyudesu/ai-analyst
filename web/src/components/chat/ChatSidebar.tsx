"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pin, Edit2, Check, MessageSquare, Database, ChartBar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { threadsClient } from "@/lib/threads-client";
import { useRouter, useSearchParams } from "next/navigation";

const DEFAULT_AGENT_ID = "data-analyst";

const AGENT_ICONS: Record<string, React.ElementType> = {
  "data-analyst": Database,
  "chart-agent": ChartBar,
  "supabase-agent": Database,
} as const;

interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  agentId?: string;
  isPinned?: boolean;
}

export function ChatSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Get current thread ID from localStorage or create new one
  const currentThreadId = threadsClient.getOrCreateThreadId();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    sessionId: string | null;
    sessionTitle: string;
  }>({
    isOpen: false,
    sessionId: null,
    sessionTitle: "",
  });
  const [sessionActionsOpen, setSessionActionsOpen] = useState<string | null>(null);

  const loadSessions = useCallback(() => {
    const stored = localStorage.getItem("chat-sessions");
    if (stored) {
      const parsed = JSON.parse(stored);
      setSessions(
        parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
        }))
      );
    }
  }, []);

  const saveSessions = useCallback((updatedSessions: ChatSession[]) => {
    localStorage.setItem("chat-sessions", JSON.stringify(updatedSessions));
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const startNewChat = useCallback(() => {
    threadsClient.clearCurrentThreadId();
    const newThreadId = threadsClient.getOrCreateThreadId();
    // Navigate to the new thread
    router.push("/chat");
    // Force reload to reset the chat
    window.location.reload();
  }, [router]);

  const switchSession = useCallback(
    (sessionId: string) => {
      threadsClient.setCurrentThreadId(sessionId);
      router.push("/chat");
      window.location.reload();
    },
    [router]
  );

  const deleteSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => {
        const updated = prev.filter((s) => s.id !== sessionId);
        saveSessions(updated);
        return updated;
      });

      if (sessionId === currentThreadId) {
        startNewChat();
      }

      setDeleteDialog({ isOpen: false, sessionId: null, sessionTitle: "" });
    },
    [currentThreadId, saveSessions, startNewChat]
  );

  const pinSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => {
        const session = prev.find((s) => s.id === sessionId);
        if (!session) return prev;

        const updated = prev.map((s) =>
          s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s
        );
        saveSessions(updated);
        return updated;
      });
    },
    [saveSessions]
  );

  const renameSession = useCallback(
    (sessionId: string, newTitle: string) => {
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === sessionId ? { ...s, title: newTitle } : s
        );
        saveSessions(updated);
        return updated;
      });

      setEditingSessionId(null);
    },
    [saveSessions]
  );

  const confirmDeleteSession = useCallback((sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId);
    setDeleteDialog({
      isOpen: true,
      sessionId,
      sessionTitle: session?.title || "This chat",
    });
  }, [sessions]);

  return (
    <div className="flex flex-col h-full">
      {/* New Chat Button */}
      <div className="p-4 border-b border-border">
        <Button
          onClick={startNewChat}
          className="w-full justify-start"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
          Recent Chats
        </h3>
        <div className="space-y-1">
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 px-2">
              No chat history yet
            </p>
          ) : (
            sessions
              .sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return b.createdAt.getTime() - a.createdAt.getTime();
              })
              .map((session) => {
                const SessionIcon = AGENT_ICONS[session.agentId || ""] || MessageSquare;
                const isActive = session.id === currentThreadId;
                const isEditing = editingSessionId === session.id;

                return (
                  <div
                    key={session.id}
                    className={`
                      group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
                      ${
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                      }
                      ${!isEditing ? "cursor-pointer" : ""}
                    `}
                    onClick={() => !isEditing && switchSession(session.id)}
                  >
                    {session.isPinned && (
                      <Pin className="w-3 h-3 text-primary shrink-0" />
                    )}
                    <SessionIcon className="w-4 h-4 shrink-0" />

                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-1">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editingTitle.trim()) {
                              renameSession(session.id, editingTitle.trim());
                            } else if (e.key === "Escape") {
                              setEditingSessionId(null);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 text-xs bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
                          autoFocus
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (editingTitle.trim()) {
                              renameSession(session.id, editingTitle.trim());
                            }
                          }}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <Check className="w-3 h-3 text-green-600" />
                        </button>
                      </div>
                    ) : (
                      <span className="flex-1 text-xs truncate">
                        {session.title}
                      </span>
                    )}

                    {!isEditing && (
                      <DropdownMenu
                        open={sessionActionsOpen === session.id}
                        onOpenChange={(open) =>
                          setSessionActionsOpen(open ? session.id : null)
                        }
                      >
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSessionActionsOpen(
                                sessionActionsOpen === session.id ? null : session.id
                              );
                            }}
                            className={`
                              opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity
                              ${sessionActionsOpen === session.id ? "opacity-100" : ""}
                            `}
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-40"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingTitle(session.title);
                              setEditingSessionId(session.id);
                              setSessionActionsOpen(null);
                            }}
                            className="cursor-pointer text-xs"
                          >
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              pinSession(session.id);
                              setSessionActionsOpen(null);
                            }}
                            className="cursor-pointer text-xs"
                          >
                            {session.isPinned ? "Unpin" : "Pin"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              confirmDeleteSession(session.id);
                              setSessionActionsOpen(null);
                            }}
                            className="cursor-pointer text-xs text-destructive focus:text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Thread Info */}
      <div className="p-3 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Thread: <span className="font-mono">{currentThreadId.slice(0, 8)}</span>
        </p>
      </div>
    </div>
  );
}
