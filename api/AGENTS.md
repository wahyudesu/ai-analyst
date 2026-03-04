# AI Analyst API

Mastra-powered API for AI data analysts with PostgreSQL integration.

## Stack

- **Framework**: [Mastra](https://mastra.ai/) - AI Agent Framework
- **Runtime**: Node.js >=22.13.0
- **Language**: TypeScript (ESM)
- **Database**: PostgreSQL via `pg`

## Project Structure

```
api/ We're software experts
so that you don't have to be
Software We Review
├── src/mastra/
│   ├── agents/
│   │   ├── postgres.ts         # PostgreSQL data analyst agent
│   │   ├── supabase.ts         # Supabase data analyst agent (via Composio MCP)
│   │   ├── testingagent.ts     # Simple testing agent
│   │   └── prompt/             # Agent instructions
│   ├── tools/
│   │   ├── postgres/
│   │   │   ├── execute-sql.ts          # Execute SQL queries
│   │   │   ├── get-schema.ts           # Get overview of all tables
│   │   │   ├── get-table.ts            # Get schema for specific tables
│   │   │   ├── explain-query.ts        # Explain SQL query in natural language
│   │   │   ├── analyze-results.ts      # Analyze query results for insights
│   │   │   ├── sql-validator-v2.ts     # Enhanced SQL validation
│   │   │   └── index.ts                # Tool exports
│   │   └── charts/
│   │       ├── auto-detect.ts           # Chart auto-detection logic
│   │       ├── generate-chart.ts        # Single chart generation
│   │       ├── suggest-charts.ts        # Multi-chart suggestions
│   │       ├── data-processors.ts       # Data transformation
│   │       └── index.ts                 # Tool exports
│   ├── config/
│   │   └── models.ts           # Centralized model configuration
│   ├── lib/
│   │   ├── auth.ts              # Authentication system
│   │   ├── errors.ts            # Structured error handling
│   │   └── request-context.ts   # Secure request context storage
│   ├── routes/
│   │   ├── chat.ts              # Chat API route
│   │   ├── auth.ts              # Authentication routes
│   │   ├── models.ts            # Model configuration routes
│   │   ├── sql.ts               # Direct SQL execution route
│   │   └── threads.ts           # Thread/session management
│   └── index.ts                 # Mastra instance & exports
├── package.json
└── tsconfig.json
```

## Development

```bash
# Install dependencies
pnpm install

# Start development server (Mastra Studio at http://localhost:4111)
pnpm dev

# Type check
npx tsc --noEmit
```

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# Authentication (optional, set AUTH_ENABLED=false to disable)
AUTH_ENABLED="true"
AUTH_EMAIL="admin@example.com"
AUTH_PASSWORD="your-password"
JWT_SECRET="your-secret-key"

# Model Configuration
DEFAULT_MODEL_ID="zai-coding-plan/glm-4.5"

# Storage (Upstash - optional for production)
UPSTASH_REDIS_REST_URL="https://your-upstash-url"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
```

## Agents

### Data Analyst (`data-analyst`)

PostgreSQL-focused data analyst with native tools.

**Model:** `zai-coding-plan/glm-4.5` (configurable via `DEFAULT_MODEL_ID`)

**PostgreSQL Tools:**
- `getSchema` - Get overview of all tables in database
- `getTable` - Get detailed schema for specific tables
- `explainQuery` - Explain SQL query in natural language
- `executeSQL` - Execute SQL query to retrieve data
- `analyzeResults` - Analyze results and detect patterns

**Chart Tools:**
- `generateChart` - Generate a single chart with smart auto-detection
- `suggestCharts` - Analyze data and suggest multiple chart configurations

**Enhanced Workflow:**
1. `getSchema` - Explore available tables
2. `getTable` - Understand specific table structure
3. `explainQuery` (optional) - Explain what query will do
4. `executeSQL` - Run the query
5. `analyzeResults` (optional) - Get automatic insights
6. `generateChart`/`suggestCharts` - Create visualizations

## API Routes

### Authentication

#### `POST /api/auth/login`
Login with email and password to get JWT token.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here"
}
```

#### `GET /api/auth/check`
Check if current token is valid.

**Headers:** `Authorization: Bearer <token>`

### Models

#### `GET /api/models`
Get list of available models.

**Response:**
```json
{
  "models": [
    { "id": "zai-coding-plan/glm-4.5", "name": "ZAI GLM 4.5", "provider": "zai" },
    { "id": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openai" }
  ],
  "default": "zai-coding-plan/glm-4.5"
}
```

### Chat

#### `POST /api/chat/:agentId`
Send chat message to agent.

**Headers:** `Authorization: Bearer <token>` (if auth enabled)

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Show me top 10 products by sales" }
  ],
  "modelId": "zai-coding-plan/glm-4.5",  // Optional: override default model
  "databaseUrl": "postgresql://...",      // Optional: user-provided database
  "memory": {
    "thread": { "id": "thread-id" }       // Optional: continue thread
  }
}
```

**Response:** Server-Sent Events stream

### Messages

#### `GET /api/messages?threadId={id}&agentId={id}`
Get message history for a thread.

### Threads

#### `GET /api/threads?agentId={id}`
List threads with message counts.

## Security Features

1. **Connection String Protection:** Database URLs are stored in AsyncLocalStorage, NOT exposed to LLM
2. **SQL Injection Protection:** Enhanced validator with pattern detection and query complexity analysis
3. **Simple Authentication:** Hardcoded credentials with JWT tokens
4. **Rate Limiting:** Configurable request limits per session
5. **Query Timeout:** 30s maximum execution time

## Error Handling

Structured error responses with helpful messages:

```json
{
  "success": false,
  "error": {
    "code": "SQL_INVALID_COLUMN",
    "message": "Column does not exist",
    "suggestion": "Check the column name using getSchema or getTable tools",
    "fixable": true
  }
}
```

## Adding New Tools

Create in `src/mastra/tools/<category>/`:

```typescript
import { createTool } from "@mastra/core/tools"
import { z } from "zod"

export const myTool = createTool({
  id: "my-tool",
  description: "What this tool does",
  inputSchema: z.object({
    param: z.string(),
  }),
  execute: async ({ param }) => {
    // Access secure context if needed
    // const databaseUrl = getDatabaseUrl();

    return { result: `Hello ${param}` }
  },
})
```

Export in `index.ts` and add to agent's `tools` object.
