# AI Analyst API

Mastra-powered API for AI data analysts with PostgreSQL integration.

## Stack

- **Framework**: [Mastra](https://mastra.ai/) - AI Agent Framework
- **Runtime**: Node.js >=22.13.0
- **Language**: TypeScript (ESM)
- **Database**: PostgreSQL via `pg`

## Project Structure

```
api/
├── src/mastra/
│   ├── agents/
│   │   ├── postgres.ts      # PostgreSQL data analyst agent
│   │   ├── supabase.ts      # Supabase data analyst agent (via Composio MCP)
│   │   └── prompt.ts        # Shared agent instructions
│   ├── tools/
│   │   └── postgres/
│   │       ├── execute-sql.ts       # Execute SQL queries
│   │       ├── list-tables.ts       # List all tables
│   │       ├── get-table-schema.ts  # Get table structure
│   │       └── index.ts             # Tool exports
│   └── index.ts             # Mastra instance & exports
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

## Agents

### Data Analyst (`sqlagent`)
PostgreSQL-focused data analyst with native tools.

**Tools:**
- `execute-sql` - Run SQL queries
- `list-tables` - List tables with row count & size
- `get-table-schema` - Get column details

**Model:** `openai/o4-mini`

### Supabase Agent (`supabaseAgent`)
Supabase data analyst using Composio MCP integration.

## Adding New Tools

Create in `src/mastra/tools/<category>/`:

```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const myTool = createTool({
  id: 'my-tool',
  description: 'What this tool does',
  inputSchema: z.object({
    param: z.string(),
  }),
  execute: async ({ param }) => {
    return { result: `Hello ${param}` };
  },
});
```

Export in `index.ts` and add to agent's `tools` object.
