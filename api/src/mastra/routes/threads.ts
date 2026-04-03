import { toAISdkV5Messages } from "@mastra/ai-sdk/ui"
import type { Memory } from "@mastra/memory"
import { casualChatMemory, dataAnalystMemory } from "../memory"

// MastraDBMessage interface from Mastra
export interface MastraDBMessage {
  id: string
  threadId: string
  role: "system" | "user" | "assistant" | "tool"
  content?: string
  createdAt?: Date
  [key: string]: unknown
}

/**
 * Thread/Session Management API Routes
 *
 * Manages chat sessions using Mastra's Memory API
 */

// Map agent ID to its memory instance
const AGENT_MEMORY: Record<string, Memory> = {
  "data-analyst": dataAnalystMemory,
  "chart-agent": casualChatMemory,
  "supabase-agent": dataAnalystMemory,
}

// Default resource ID for anonymous users
const DEFAULT_RESOURCE_ID = "anonymous"

export interface CreateThreadInput {
  agentId: string
  title?: string
  resourceId?: string
  initialMemory?: string
}

export interface Thread {
  id: string
  resourceId: string
  title?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

/**
 * Create a new chat thread/session
 */
export async function createThread(input: CreateThreadInput): Promise<Thread> {
  const memory = AGENT_MEMORY[input.agentId] || casualChatMemory

  const threadId = crypto.randomUUID()
  const resourceId = input.resourceId || DEFAULT_RESOURCE_ID
  const now = new Date()

  const thread = await memory.saveThread({
    thread: {
      id: threadId,
      resourceId,
      title: input.title || "New Chat",
      metadata: input.initialMemory
        ? { workingMemory: input.initialMemory }
        : undefined,
      createdAt: now,
      updatedAt: now,
    },
  })

  return {
    id: thread.id!,
    resourceId: thread.resourceId,
    title: thread.title ?? undefined,
    metadata: thread.metadata ?? undefined,
    createdAt: new Date(thread.createdAt!),
    updatedAt: new Date(thread.updatedAt!),
  }
}

/**
 * Get a thread by ID
 */
export async function getThread(
  threadId: string,
  agentId: string
): Promise<Thread | null> {
  const memory = AGENT_MEMORY[agentId] || casualChatMemory

  const thread = await memory.getThreadById({ threadId })

  if (!thread) return null

  return {
    id: thread.id!,
    resourceId: thread.resourceId,
    title: thread.title ?? undefined,
    metadata: thread.metadata ?? undefined,
    createdAt: new Date(thread.createdAt!),
    updatedAt: new Date(thread.updatedAt!),
  }
}

/**
 * List threads for a resource (user)
 */
export async function listThreads(args: {
  agentId: string
  resourceId?: string
  page?: number
  perPage?: number | false
}): Promise<Thread[]> {
  const memory = AGENT_MEMORY[args.agentId] || casualChatMemory

  const result = await memory.listThreads({
    page: args.page ?? 0,
    perPage: args.perPage ?? 50,
    filter: args.resourceId
      ? {
          resourceId: args.resourceId,
        }
      : undefined,
  })

  return (result.threads || [])
    .filter(thread => Boolean(thread.id && thread.resourceId))
    .map(thread => ({
      id: thread.id!,
      resourceId: thread.resourceId!,
      title: thread.title ?? undefined,
      metadata: thread.metadata ?? undefined,
      createdAt: new Date(thread.createdAt!),
      updatedAt: new Date(thread.updatedAt!),
    }))
}

/**
 * Update thread title or metadata
 */
export async function updateThread(args: {
  threadId: string
  agentId: string
  title?: string
  metadata?: Record<string, unknown>
}): Promise<Thread> {
  const memory = AGENT_MEMORY[args.agentId] || casualChatMemory

  const existing = await memory.getThreadById({ threadId: args.threadId })
  if (!existing) {
    throw new Error("Thread not found")
  }

  const updated = await memory.updateThread({
    id: args.threadId,
    title: args.title || existing.title || "",
    metadata: args.metadata || existing.metadata || {},
  })

  return {
    id: updated.id!,
    resourceId: updated.resourceId,
    title: updated.title ?? undefined,
    metadata: updated.metadata ?? undefined,
    createdAt: new Date(updated.createdAt!),
    updatedAt: new Date(updated.updatedAt!),
  }
}

/**
 * Delete a thread
 */
export async function deleteThread(args: {
  threadId: string
  agentId: string
}): Promise<void> {
  const memory = AGENT_MEMORY[args.agentId] || casualChatMemory

  await memory.deleteThread(args.threadId)
}

/**
 * Get working memory for a thread
 */
export async function getWorkingMemory(args: {
  threadId: string
  agentId: string
  resourceId?: string
}): Promise<string | null> {
  const memory = AGENT_MEMORY[args.agentId] || casualChatMemory

  const workingMemory = await memory.getWorkingMemory({
    threadId: args.threadId,
    resourceId: args.resourceId,
  })

  return workingMemory
}

/**
 * Update working memory for a thread
 */
export async function updateWorkingMemory(args: {
  threadId: string
  agentId: string
  resourceId?: string
  workingMemory: string
}): Promise<void> {
  const memory = AGENT_MEMORY[args.agentId] || casualChatMemory

  await memory.updateWorkingMemory({
    threadId: args.threadId,
    resourceId: args.resourceId,
    workingMemory: args.workingMemory,
  })
}

/**
 * Get messages for a thread
 * Returns messages in AI SDK v5+ UIMessage format for UI rendering
 */
export async function getThreadMessages(args: {
  threadId: string
  agentId?: string
  page?: number
  perPage?: number
}): Promise<{
  messages: unknown[]
  total?: number
  hasMore?: boolean
}> {
  // Use the agent's memory instance to recall messages
  // This ensures we retrieve messages from the same storage the agent uses
  const memory = AGENT_MEMORY[args.agentId || ""] || casualChatMemory

  try {
    // Use memory.recall() to get messages for the thread
    const { messages } = await memory.recall({
      threadId: args.threadId,
      page: args.page ?? 0,
      perPage: args.perPage ?? 100,
    })

    // Convert to AI SDK v5+ UIMessage format for UI rendering
    const uiMessages =
      messages && messages.length > 0 ? toAISdkV5Messages(messages) : []

    return {
      messages: uiMessages,
      total: messages?.length || 0,
    }
  } catch (error) {
    console.error("Error recalling messages:", error)
    return { messages: [] }
  }
}

/**
 * List all threads for a resource (user) with their message counts
 * Useful for displaying chat history in the sidebar
 */
export async function listThreadsWithMessageCount(args: {
  agentId: string
  resourceId?: string
  page?: number
  perPage?: number | false
}): Promise<Array<Thread & { messageCount?: number }>> {
  const threads = await listThreads(args)

  // Use the agent's memory instance to get message counts
  const memory = AGENT_MEMORY[args.agentId] || casualChatMemory

  const threadsWithCounts = await Promise.all(
    threads.map(async thread => {
      try {
        // Use memory.recall() to get messages and count them
        const { messages } = await memory.recall({
          threadId: thread.id,
          page: 0,
          perPage: 1, // Just to check if messages exist
        })
        return {
          ...thread,
          messageCount: messages?.length || 0,
        }
      } catch {
        return thread
      }
    })
  )

  return threadsWithCounts
}
