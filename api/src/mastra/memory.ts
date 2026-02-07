import { Memory } from "@mastra/memory"
import { LibSQLStore } from "@mastra/libsql"

/**
 * Shared storage for memory - MUST match Mastra's storage configuration
 * Using the same database file ensures messages are persisted correctly
 *
 * NOTE: Both memory and Mastra instance use file:../mastra.db
 * which resolves to api/mastra.db from the api/src/mastra directory
 */
const memoryStorage = new LibSQLStore({
  id: "memory-storage",
  url: "file:../mastra.db", // Path from api/src/mastra to api/mastra.db
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
