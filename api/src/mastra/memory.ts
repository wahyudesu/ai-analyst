import { LibSQLStore } from "@mastra/libsql"
import { Memory } from "@mastra/memory"

/**
 * Shared storage for memory - LibSQLite database
 *
 * Environment variables (optional):
 * - DATABASE_URL: LibSQLite connection string (default: file:./mastra.db for local)
 */
const memoryStorage = new LibSQLStore({
  id: "memory-storage",
  url: process.env.MEMORY_URL || "file:./mastra.db",
})

/**
 * Shared memory configuration for all agents
 * Uses thread-scoped working memory for chat session management
 *
 * IMPORTANT: Memory MUST use the same storage as Mastra instance
 * for messages to be persisted and retrieved correctly
 */

/**
 * Memory instance for chat sessions
 * Thread-scoped: Each conversation thread has its own isolated memory
 */
export const chatMemory = new Memory({
  storage: memoryStorage,
  options: {
    // Enable message history storage
    lastMessages: 100, // Store last 100 messages per thread
    workingMemory: {
      enabled: true,
      scope: "thread",
      template: `# Chat Session Context

## Conversation Topic
- Main Topic:
- Subtopics Discussed:

## User Preferences
- Communication Style:
- Response Format Preference:

## Session Activity
- Tools Used:
- Queries/Data Accessed:
- Outputs Generated:

## Notes & Reminders
`,
    },
  },
})

/**
 * Memory instance for data analysis sessions (more specialized)
 */
export const dataAnalystMemory = new Memory({
  storage: memoryStorage,
  options: {
    // Enable message history storage
    lastMessages: 100, // Store last 100 messages per thread
    workingMemory: {
      enabled: true,
      scope: "thread",
      template: `# Data Analysis Session

## Database Context
- Database Connected:
- Tables Analyzed:
- Schema Understanding:

## Analysis History
- SQL Queries Executed:
- Charts Generated:
- Insights Found:

## User Preferences
- Preferred Chart Types:
- Analysis Focus Area:
- Output Format Preference:

## Session Notes
`,
    },
  },
})

/**
 * Memory instance for testing/casual chat
 */
export const casualChatMemory = new Memory({
  storage: memoryStorage,
  options: {
    // Enable message history storage
    lastMessages: 100, // Store last 100 messages per thread
    workingMemory: {
      enabled: true,
      scope: "thread",
      template: `# Conversation Context

## About User
- Name:
- Interests:
- Context:

## Current Discussion
- Topic:
- Key Points:

## Notes
`,
    },
  },
})
