/**
 * Thread/Session Management Client
 *
 * Manages chat sessions with message persistence
 */

const MASTRA_URL = process.env.NEXT_PUBLIC_MASTRA_URL || "http://localhost:4111"

// Storage keys
const MESSAGES_KEY = "chat-messages"

export interface Thread {
  id: string
  resourceId: string
  title?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface CreateThreadInput {
  agentId: string
  title?: string
  resourceId?: string
  initialMemory?: string
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  createdAt: Date
}

/**
 * Thread API Client with message persistence
 */
export const threadsClient = {
  /**
   * Get or create current thread ID from localStorage
   * Creates a new UUID if none exists
   */
  getOrCreateThreadId(): string {
    if (typeof window === "undefined") return crypto.randomUUID()
    let threadId = localStorage.getItem("currentThreadId")
    if (!threadId) {
      threadId = crypto.randomUUID()
      localStorage.setItem("currentThreadId", threadId)
    }
    return threadId
  },

  /**
   * Set current thread ID in localStorage
   */
  setCurrentThreadId(threadId: string): void {
    if (typeof window === "undefined") return
    localStorage.setItem("currentThreadId", threadId)
  },

  /**
   * Clear current thread ID and start fresh
   */
  clearCurrentThreadId(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem("currentThreadId")
  },

  /**
   * Get resource ID (user ID) from localStorage
   */
  getResourceId(): string {
    if (typeof window === "undefined") return "anonymous"
    return localStorage.getItem("resourceId") || "anonymous"
  },

  /**
   * Set resource ID (user ID) in localStorage
   */
  setResourceId(resourceId: string): void {
    if (typeof window === "undefined") return
    localStorage.setItem("resourceId", resourceId)
  },

  /**
   * Get messages for a specific thread from localStorage
   */
  getMessages(threadId: string): ChatMessage[] {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem(MESSAGES_KEY)
      if (stored) {
        const allMessages = JSON.parse(stored) as Record<string, ChatMessage[]>
        const threadMessages = allMessages[threadId] || []
        return threadMessages.map((m: any) => ({
          ...m,
          createdAt: new Date(m.createdAt),
        }))
      }
    } catch (error) {
      console.error("Failed to load chat messages:", error)
    }
    return []
  },

  /**
   * Save messages for a specific thread to localStorage
   */
  saveMessages(threadId: string, messages: ChatMessage[]): void {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem(MESSAGES_KEY)
      const allMessages = stored ? JSON.parse(stored) : {}
      allMessages[threadId] = messages
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(allMessages))
    } catch (error) {
      console.error("Failed to save chat messages:", error)
    }
  },

  /**
   * Add a single message to a thread
   */
  addMessage(threadId: string, message: Omit<ChatMessage, "id" | "createdAt">): ChatMessage {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    }
    const messages = this.getMessages(threadId)
    messages.push(newMessage)
    this.saveMessages(threadId, messages)
    return newMessage
  },

  /**
   * Clear messages for a specific thread
   */
  clearMessages(threadId: string): void {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem(MESSAGES_KEY)
      if (stored) {
        const allMessages = JSON.parse(stored)
        delete allMessages[threadId]
        localStorage.setItem(MESSAGES_KEY, JSON.stringify(allMessages))
      }
    } catch (error) {
      console.error("Failed to clear chat messages:", error)
    }
  },

  /**
   * Delete messages for a thread (when deleting session)
   */
  deleteMessages(threadId: string): void {
    this.clearMessages(threadId)
  },
}

/**
 * Build chat options with thread/memory context
 */
export function buildChatOptions(agentId: string) {
  const threadId = threadsClient.getOrCreateThreadId()
  const resourceId = threadsClient.getResourceId()

  return {
    threadId,
    resourceId,
    memoryOptions: {
      thread: threadId,
      resource: resourceId,
    },
  }
}
