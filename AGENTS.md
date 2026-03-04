# AI Analyst - Agents Documentation

This document provides a comprehensive overview of all AI agents in the AI Analyst system.

## Table of Contents

- [System Overview](#system-overview)
- [Available Agents](#available-agents)
- [Agent Tools](#agent-tools)
- [Usage Examples](#usage-examples)
- [Architecture](#architecture)

## System Overview

AI Analyst is an AI-powered data analysis platform that combines:

- **Backend**: Mastra-powered API with intelligent agents for database analysis and visualization
- **Frontend**: Next.js web application for interactive data visualization
- **Database**: PostgreSQL integration for querying and analyzing data

The system uses multiple specialized agents that work together to transform natural language questions into SQL queries, execute them, and visualize the results.

## Available Agents

### 1. SQL Agent (`sqlagent`)

**Purpose**: PostgreSQL data analyst with native database tools

**Description**: The primary agent for analyzing PostgreSQL databases. It understands natural language questions, explores database schemas, writes SQL queries, and can generate visualizations.

**Capabilities**:
- Explore database schema and table structures
- Convert natural language to SQL queries
- Execute SQL queries safely
- Generate chart visualizations from query results

**Tools**:
- `get-schema` - Get overview of all tables in database
- `get-table` - Get detailed schema for specific tables
- `explain-query` - Explain SQL query in natural language
- `execute-sql` - Execute SQL queries
- `analyze-results` - Analyze results and detect patterns
- `generate-chart` - Generate single chart visualization
- `suggest-charts` - Get multiple chart suggestions

**Model**: `zai-coding-plan/glm-4.5` (configurable)

**Enhanced Workflow**:
1. Use `get-schema` to understand available tables
2. Use `get-table` to understand specific table structures
3. Use `explain-query` (optional) to explain query plan
4. Use `execute-sql` to run queries
5. Use `analyze-results` (optional) for automatic insights
6. Use chart tools to visualize results

**Security Features**:
- Connection strings stored in AsyncLocalStorage (not exposed to LLM)
- Enhanced SQL injection protection
- Query complexity validation
- Structured error handling

---

### 2. Chart Agent (`chartAgent`)

**Purpose**: Specialized agent for rendering chart visualizations

**Description**: A focused agent dedicated to transforming data into beautiful, insightful chart configurations for frontend rendering with Recharts.

**Capabilities**:
- Auto-detect optimal chart types based on data
- Generate single charts with customization
- Suggest multiple chart variations
- Apply best practices for data visualization

**Tools**:
- `generate-chart` - Generate a single chart (bar, line, area, pie)
- `suggest-charts` - Analyze data and suggest multiple chart configurations

**Model**: `zai-coding-plan/glm-4.5`

**Supported Chart Types**:
- `bar` - Comparisons across categories
- `line` - Trends over time
- `area` - Volume/magnitude over time
- `pie` - Proportions of a whole (max 5-7 categories)

---

### 3. Supabase Agent (`supabaseAgent`)

**Purpose**: Supabase data analyst using Composio MCP integration

**Description**: Specialized agent for analyzing Supabase databases through the Composio MCP integration layer.

**Capabilities**:
- Connect to Supabase databases
- Query and analyze Supabase data
- Leverage Composio integration for enhanced functionality

**Model**: `zai-coding-plan/glm-4.5`

---

### 4. Testing Agent (`testingagent`)

**Purpose**: Simple agent for testing and development

**Description**: A lightweight agent used for testing agent functionality and development workflows.

**Model**: `zai-coding-plan/glm-4.5`

## Agent Tools

### PostgreSQL Tools

#### `get-schema`
Get an overview of all tables in the database.

**Usage**:
```typescript
// First step to understand available tables
await getSchema()
```

**Returns**: List of all tables with basic information

---

#### `get-table`
Get detailed schema for one or several specific tables.

**Parameters**:
- `tableNames` (string[]) - Array of table names to inspect

**Usage**:
```typescript
await getTable({ tableNames: ['users', 'orders'] })
```

**Returns**: Column names, data types, constraints, and relationships

---

#### `execute-sql`
Execute SQL queries to retrieve data.

**Parameters**:
- `query` (string) - SQL query to execute

**Usage**:
```typescript
await executeSql({ 
  query: "SELECT * FROM orders WHERE total > 100" 
})
```

**Returns**:
```typescript
{
  columns: string[],
  rows: any[][],
  rowCount: number,
  executionTime: number,
  complexityScore: number,
  suggestions?: string[]
}
```

---

#### `explain-query`
Explain what a SQL query does in natural language.

**Parameters**:
- `query` (string) - SQL query to explain

**Usage**:
```typescript
await explainQuery({
  query: "SELECT status, COUNT(*) FROM orders GROUP BY status"
})
```

**Returns**: Natural language explanation of the query

---

#### `analyze-results`
Analyze query results and detect patterns, outliers, and insights.

**Parameters**:
- `data` - Query result from execute-sql

**Usage**:
```typescript
await analyzeResults({
  data: sqlResult
})
```

**Returns**:
```typescript
{
  insights: string[],
  patterns: string[],
  outliers: string[],
  summary: {
    rowCount: number,
    columnCount: number,
    numericColumns: string[]
  }
}
```

### Chart Tools

#### `generate-chart`
Generate a single chart with smart auto-detection.

**Parameters**:
- `data` - Query result data
- `chartType` - Type: 'bar' | 'line' | 'area' | 'pie'
- `title` - Chart title
- `xAxis` - X-axis field name (optional, auto-detected)
- `yAxis` - Y-axis field name (optional, auto-detected)

**Usage**:
```typescript
// Simple auto-detected chart
await generateChart({
  data: sqlResult,
  chartType: "bar",
  title: "Sales by Month"
})

// With explicit axes
await generateChart({
  data: sqlResult,
  chartType: "line",
  title: "Revenue Trend",
  xAxis: "date",
  yAxis: "revenue"
})
```

**Returns**: Chart configuration object for Recharts

---

#### `suggest-charts`
Analyze data and suggest multiple chart configurations.

**Parameters**:
- `data` - Query result data
- `title` - Base title for charts

**Usage**:
```typescript
await suggestCharts({
  data: sqlResult,
  title: "Sales Analysis"
})
```

**Returns**: Array of chart configurations (bar, line, pie, etc.)

## Usage Examples

### Example 1: Basic Data Analysis

```typescript
// User: "What are the top 10 products by sales?"

// Agent workflow:
// 1. Get schema to find relevant tables
const schema = await getSchema()

// 2. Get table details
const tableInfo = await getTable({ tableNames: ['products', 'sales'] })

// 3. Execute query
const result = await executeSql({
  query: `
    SELECT p.name, SUM(s.amount) as total_sales
    FROM products p
    JOIN sales s ON p.id = s.product_id
    GROUP BY p.name
    ORDER BY total_sales DESC
    LIMIT 10
  `
})

// 4. Generate visualization
const chart = await generateChart({
  data: result,
  chartType: "bar",
  title: "Top 10 Products by Sales"
})
```

### Example 2: Time Series Analysis

```typescript
// User: "Show me revenue trends over the last 12 months"

const result = await executeSql({
  query: `
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      SUM(total) as revenue
    FROM orders
    WHERE created_at >= NOW() - INTERVAL '12 months'
    GROUP BY month
    ORDER BY month
  `
})

const chart = await generateChart({
  data: result,
  chartType: "line",
  title: "Revenue Trend (Last 12 Months)",
  xAxis: "month",
  yAxis: "revenue"
})
```

### Example 3: Multiple Chart Suggestions

```typescript
// User: "Analyze customer demographics"

const result = await executeSql({
  query: "SELECT age_group, country, count(*) as customers FROM customers GROUP BY age_group, country"
})

// Get multiple chart suggestions
const suggestions = await suggestCharts({
  data: result,
  title: "Customer Demographics"
})

// Returns array of chart configs:
// - Bar chart: Customers by Age Group
// - Pie chart: Customers by Country
// - Bar chart: Customers by Age Group and Country
```

## Architecture

### Project Structure

```
ai-analyst/
├── api/                    # Mastra API backend
│   └── src/mastra/
│       ├── agents/         # Agent definitions
│       │   ├── postgres.ts
│       │   ├── supabase.ts
│       │   ├── testingagent.ts
│       │   └── prompt/     # Agent instructions
│       └── tools/          # Tool implementations
│           ├── postgres/   # Database tools
│           └── charts/     # Visualization tools
│
├── web/                    # Next.js frontend
│   └── src/
│       ├── app/            # App router pages
│       └── components/
│           └── charts/     # Recharts components
│
└── AGENTS.md               # This file
```

### Technology Stack

**Backend (API)**:
- Framework: Mastra (AI Agent Framework)
- Runtime: Node.js >=22.13.0
- Language: TypeScript (ESM)
- Database: PostgreSQL via `pg`
- AI Model: GLM-4.5

**Frontend (Web)**:
- Framework: Next.js 16 (App Router)
- Runtime: React 19
- Styling: Tailwind CSS v4
- Charts: Recharts
- Language: TypeScript

### Data Flow

```
User Question
     ↓
[SQL Agent]
     ↓
1. get-schema (understand tables)
2. get-table (understand structure)
3. execute-sql (get data)
     ↓
[Chart Agent] (optional)
     ↓
generate-chart / suggest-charts
     ↓
[Web Frontend]
     ↓
Recharts Visualization
```

## Development

### Starting the Development Environment

```bash
# Root directory
pnpm install

# Start API (Mastra Studio at http://localhost:4111)
cd api && pnpm dev

# Start Web (http://localhost:3000)
cd web && pnpm dev
```

### Adding New Agents

1. Create agent file in `api/src/mastra/agents/`
2. Define agent with tools and instructions
3. Export from `api/src/mastra/index.ts`
4. Update this documentation

### Adding New Tools

1. Create tool in `api/src/mastra/tools/<category>/`
2. Use `createTool` from `@mastra/core/tools`
3. Export from category's `index.ts`
4. Add to agent's `tools` object

Example:
```typescript
import { createTool } from "@mastra/core/tools"
import { z } from "zod"

export const myTool = createTool({
  id: "my-tool",
  description: "Tool description",
  inputSchema: z.object({
    param: z.string().describe("Parameter description"),
  }),
  execute: async ({ param }) => {
    // Implementation
    return { result: `Processed: ${param}` }
  },
})
```

## Best Practices

### For SQL Agent
1. Always use `get-schema` first to understand the database
2. Use `get-table` before writing complex queries
3. Prefer parameterized queries for safety
4. Limit result sets for large tables

### For Chart Agent
1. Let auto-detection choose axes when possible
2. Use `suggest-charts` for exploratory analysis
3. Choose chart types based on data characteristics:
   - **Bar**: Comparisons, rankings
   - **Line**: Trends over time
   - **Area**: Volume over time
   - **Pie**: Proportions (few categories only)

### General
1. Start with schema exploration
2. Break complex queries into steps
3. Validate results before visualization
4. Use appropriate chart types for data

## Support

For issues or questions:
1. Check the API logs in Mastra Studio
2. Review tool responses for errors
3. Validate SQL queries manually if needed
4. Check database connections

---

*Last updated: 2025-01-22*
*Version: 1.0.0*