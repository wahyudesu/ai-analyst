# AI Analyst - Comprehensive Refactor Design

**Date:** 2025-03-04
**Status:** Approved
**Approach:** Incremental

---

## Overview

Comprehensive refactor of the AI Analyst system to address security issues, technical debt, and enhance capabilities while maintaining PostgreSQL-only support with serverless deployment.

---

## Requirements

- **Scope:** All issues fixed simultaneously
- **Database:** PostgreSQL only
- **Deployment:** Serverless (single-tenant, per-request connections)
- **Models:** Multi-model support with GLM-4.5 as primary
- **Auth:** Simple hardcoded credentials (email/password), database URL in localStorage
- **Charts:** Fix and improve existing 4 chart types
- **Testing:** Minimal (critical paths only)

---

## 1. Security Fixes

### 1.1 Connection String Protection
**Current Issue:** Connection string exposed to LLM via system context

**Solution:**
```typescript
// DON'T do this (current)
context: [{
  role: "system",
  content: `Database URL: ${databaseUrl}` // ← EXPOSED TO LLM
}]

// DO this (new)
// Use Mastra's tool context - not visible to LLM
// Connection string passed directly to tools via secure context
```

**Implementation:**
- Modify tools to receive connection string via tool parameters (not via messages)
- Use Mastra's `getContext()` or tool execution context
- Never include sensitive data in message history

### 1.2 SQL Injection Protection
**Current Issue:** Regex-based sanitization is bypassable

**Solution:**
```typescript
// Use parameterized queries via pg library
const result = await pool.query({
  text: sanitizedQuery,
  values: [], // Parameters go here
  rowMode: 'array'
});

// Add query complexity validation
- Max JOIN depth: 5
- Max subquery depth: 3
- Query execution timeout: 30s
```

**Implementation:**
- Create `sql-validator-v2.ts` with proper parsing
- Use SQL parser library (e.g., `pg-query-parser`)
- Add query complexity scoring

### 1.3 Simple Authentication
```typescript
// Environment variables
AUTH_EMAIL = "admin@example.com"
AUTH_PASSWORD_HASH = "$2b$10$..." // bcrypt hash
JWT_SECRET = "..."

// Flow: POST /api/auth/login
1. Validate email/password against env
2. Generate JWT token (24h expiry)
3. Return token to client
4. Client stores token, includes in API calls
```

---

## 2. Architecture Cleanup

### 2.1 Connection Management
```
DELETE:
- connection-postgres-js.ts
- connection-pg.ts
- connection-manager.ts

KEEP (rename):
- connection-manager-v2.ts → connection-manager.ts
```

**New Configuration (serverless-optimized):**
```typescript
{
  max: 10,                    // Increased from 5
  idleTimeoutMillis: 5 * 60 * 1000,  // 5 minutes (was 2)
  connectionTimeoutMillis: 15000,
  statement_timeout: 30000,
}
```

### 2.2 Model Configuration
**New file:** `api/src/mastra/config/models.ts`
```typescript
export const MODEL_CONFIG = {
  default: 'zai-coding-plan/glm-4.5',
  fallback: ['openai/gpt-4o-mini', 'openai/gpt-4o'],

  providers: {
    zai: ['zai-coding-plan/glm-4.5', 'zai-coding-plan/glm-4.5-flash'],
    openai: ['openai/gpt-4o-mini', 'openai/gpt-4o', 'openai/o1-mini']
  },

  taskRouting: {
    simple: 'zai-coding-plan/glm-4.5-flash',
    standard: 'zai-coding-plan/glm-4.5',
    complex: 'openai/gpt-4o'
  }
};
```

### 2.3 Type Safety
**New package:** `packages/shared-types/`
```typescript
// types/database.ts
export interface QueryResult<T = unknown> {
  columns: string[];
  rows: T[][];
  rowCount: number;
  executionTime: number;
}

// types/tools.ts
export interface ToolResponse {
  success: boolean;
  data?: unknown;
  error?: ToolError;
}
```

---

## 3. Enhanced Agent Capabilities

### 3.1 Improved Text-to-SQL Workflow
```
OLD: getSchema → getTable → executeSQL → chart

NEW:
1. understandIntent()  - What does user want?
2. exploreSchema()     - What tables/columns are relevant?
3. planQuery()         - Design the query strategy
4. executeSQL()        - Run with timeout protection
5. validateResults()   - Check if results make sense
6. explainQuery()      - Natural language explanation
7. generateInsights()  - Auto-detect patterns
8. createChart()       - Visualization
```

### 3.2 Query Enhancement
```typescript
// New tool: explain-query
explainQuery({
  query: "SELECT status, COUNT(*) FROM orders GROUP BY status",
  schema: tableSchema
})
// Returns:
{
  explanation: "This query counts orders by their status...",
  columns: ["status", "count"],
  estimatedCost: "low",
  suggestedIndexes: []
}

// New tool: analyze-results
analyzeResults({
  data: queryResult
})
// Returns:
{
  rowCount: 150,
  insights: [
    "Most orders are in 'pending' status (45%)",
    "Only 5% of orders are 'cancelled'"
  ],
  outliers: [],
  trends: []
}
```

### 3.3 Chart Improvements
```typescript
// Enhanced auto-detection
function detectChartType(data: QueryResult): ChartType {
  // Check data characteristics
  const hasTime = hasDateTimeColumn(data.columns);
  const hasCategories = hasStringColumn(data.columns);
  const numericCount = countNumericColumns(data.columns);

  // Smart selection
  if (hasTime && numericCount >= 1) return 'line';
  if (hasCategories && numericCount === 1) return 'bar';
  if (numericCount >= 2) return 'scatter'; // NEW
  // ...
}

// Error handling
if (!hasNumericData(data)) {
  return {
    error: "No numeric columns found",
    suggestion: "Try adding COUNT(*) or SUM(column)",
    canAutoFix: true,
    fixedQuery: `SELECT ${category}, COUNT(*) as count FROM ...`
  };
}
```

### 3.4 Session Memory
```typescript
// localStorage structure
{
  sessions: [
    {
      id: "thread-xxx",
      title: "Sales analysis",
      queries: [
        {
          sql: "SELECT ...",
          timestamp: "...",
          rowCount: 100
        }
      ],
      templates: [
        {
          name: "Monthly Sales",
          sql: "SELECT ...",
          parameters: ["month", "year"]
        }
      ]
    }
  ]
}
```

---

## 4. API & Error Handling

### 4.1 Structured Error Response
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // "SQL_INVALID", "TIMEOUT", "NO_CONNECTION"
    message: string;        // User-friendly message
    technical: string;      // Technical details (dev-only)
    suggestion?: string;    // How to fix
    fixable: boolean;       // Can agent auto-fix?
  };
}

// Example
{
  success: false,
  error: {
    code: "SQL_INVALID_COLUMN",
    message: "Column 'cust_name' doesn't exist in the 'orders' table.",
    technical: 'column "cust_name" does not exist',
    suggestion: "Did you mean 'customer_name'?",
    fixable: true
  }
}
```

### 4.2 API Layer
```typescript
// Rate limiting (simple in-memory)
const rateLimiter = new Map<string, number[]>();
const LIMIT = 10; // requests per minute
const WINDOW = 60 * 1000; // 1 minute

// Query size limits
const MAX_ROWS = 1000;
const QUERY_TIMEOUT = 30000; // 30s
```

### 4.3 Loading States
```typescript
// Frontend: status enum
enum ProcessingStep {
  CONNECTING = "Connecting to database...",
  EXPLORING = "Exploring database schema...",
  PLANNING = "Planning query...",
  EXECUTING = "Executing query...",
  ANALYZING = "Analyzing results...",
  VISUALIZING = "Creating visualization..."
}

// Backend: emit progress events
stream.emit('progress', { step: 'EXPLORING', progress: 0.2 });
```

---

## Implementation Order (Incremental)

1. **Phase 1: Security** (P0)
   - Fix connection string exposure
   - Improve SQL injection protection
   - Add simple auth

2. **Phase 2: Architecture** (P1)
   - Consolidate connection management
   - Centralize model config
   - Add type safety

3. **Phase 3: Features** (P2)
   - Enhanced agent workflow
   - Chart improvements
   - Error handling

4. **Phase 4: Polish** (P3)
   - Loading states
   - Documentation
   - Tests

---

## Testing Strategy (Minimal)

```
api/src/mastra/tools/__tests__/
├── sql-validator.test.ts
├── execute-sql.test.ts
├── connection-manager.test.ts
└── chart-generator.test.ts
```

Focus on:
- SQL validation edge cases
- Connection pool lifecycle
- Error handling paths

---

## Success Criteria

- [ ] No sensitive data in LLM context
- [ ] All SQL queries use parameterized execution
- [ ] Single source of truth for model config
- [ ] Connection management consolidated
- [ ] Charts work reliably with all data types
- [ ] Errors are user-friendly with suggestions
- [ ] Loading indicators for all operations
- [ ] Documentation matches implementation
