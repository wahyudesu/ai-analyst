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
│   │   ├── testingagent.ts  # Simple testing agent
│   │   └── prompt/           # Agent instructions
│   ├── tools/
 │   │   ├── postgres/
 │   │   │   ├── execute-sql.ts       # Execute SQL queries
 │   │   │   ├── get-schema.ts        # Get overview of all tables
 │   │   │   ├── get-table.ts         # Get schema for one or several tables
 │   │   │   └── index.ts             # Tool exports
│   │   └── charts/
│   │       ├── auto-detect.ts      # Chart auto-detection logic
│   │       ├── generate-chart.ts    # Single chart generation tool
│   │       ├── suggest-charts.ts    # Multi-chart suggestion tool
│   │       ├── data-processors.ts  # Data transformation utilities
│   │       ├── color-palettes.ts   # Color scheme definitions
│   │       ├── types.ts            # Type definitions
│   │       └── index.ts            # Tool exports
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

**PostgreSQL Tools:**
- `get-schema` - Get overview of all tables in database (first step to understand available tables)
- `get-table` - Get detailed schema for one or several specific tables (columns, data types, constraints)
- `execute-sql` - Execute SQL query to retrieve data (text-to-sql, run this after understanding table structure)

**Chart Tools:**
- `generate-chart` - Generate a single chart with smart auto-detection
- `suggest-charts` - Analyze data and suggest multiple chart configurations

**Chart Usage:**
```typescript
// Simple auto-detected chart
generate-chart({
  data: sqlResult,
  chartType: "bar",
  title: "Sales by Month"
})

// Multiple charts with suggestions
suggest-charts({
  data: sqlResult,
  title: "Sales Analysis"
}) // Returns multiple chart suggestions (bar, line, pie, etc.)
```

**Model:** `zai-coding-plan/glm-4.5`

### Chart Agent (`chartAgent`)
Specialized agent for rendering chart visualizations from data.

**Purpose:** Transform data into chart configurations for frontend rendering using Recharts.

**Chart Tools:**
- `generate-chart` - Generate a single chart (bar, line, area, pie)
- `suggest-charts` - Get multiple chart suggestions for the same data

**Usage:**
```typescript
// Pass SQL query result to generate chart
chartAgent.generate-chart({
  data: { columns: [], rows: [], rowCount: 0 },
  chartType: "bar",
  title: "My Chart"
})
```

**Chart Types:**
- bar: Comparisons across categories
- line: Trends over time
- area: Volume/magnitude over time
- pie: Proportions of a whole (max 5-7 categories)

**Model:** `zai-coding-plan/glm-4.5`

### Supabase Agent (`supabaseAgent`)
Supabase data analyst using Composio MCP integration.

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
    return { result: `Hello ${param}` }
  },
})
```

Export in `index.ts` and add to agent's `tools` object.
