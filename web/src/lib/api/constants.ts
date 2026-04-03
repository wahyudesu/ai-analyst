/**
 * Centralized API endpoint constants
 * Provides a single source of truth for all API routes
 */
export const API_ENDPOINTS = {
  AGENTS: "/api/agents",
  CHAT: "/api/chat",
  CHAT_MESSAGES: "/api/chat/messages",
  DATABASE_TEST_CONNECTION: "/api/database/test-connection",
} as const

/**
 * TanStack Query key factory
 * Provides type-safe query keys for consistent caching and invalidation
 */
export const queryKeys = {
  agents: ["agents"] as const,
  serverHealth: ["server-health"] as const,
  messages: (threadId: string, agentId: string) =>
    ["messages", threadId, agentId] as const,
} as const

/**
 * Common error messages
 * Provides consistent error messaging across the application
 */
export const ERROR_MESSAGES = {
  AGENTS_FETCH_FAILED: "Failed to fetch agents",
  SERVER_NOT_READY: "Server not ready",
  SERVER_CONNECTION_FAILED: "Failed to connect to Mastra server",
  DATABASE_CONNECTION_FAILED: "Connection failed",
  DATABASE_TEST_FAILED: "Failed to test connection",
  DATABASE_URL_REQUIRED: "Please enter a connection URL first",
} as const
