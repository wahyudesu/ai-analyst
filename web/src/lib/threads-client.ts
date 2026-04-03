/**
 * Thread/Session Management Client
 *
 * Manages chat sessions using Mastra's Memory API
 *
 * NOTE: This is a simplified client for thread management.
 * For production, you'd want to create a Next.js API route that proxies
 * to the Mastra server to avoid CORS issues.
 */

const MASTRA_URL = process.env.NEXT_PUBLIC_MASTRA_URL || "http://localhost:4111"

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

/**
 * Thread API Client
 *
 * For now, threads are managed via Mastra's built-in chat endpoint
 * by passing memory options: { thread: string, resource?: string }
 *
 * Full thread CRUD can be added later via Next.js API routes
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
   * Useful for multi-user scenarios with persistent memory
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
    // Pass to chat endpoint via memory options
    memoryOptions: {
      thread: threadId,
      resource: resourceId,
    },
  }
}
