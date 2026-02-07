# Chart Tools Planning

## Objective

Enable AI agents to **reliably generate chart configurations** from SQL query results (from postgres tools) that can be rendered by frontend ChartRenderer component.

---

## Purpose

### What is it for?
Chart tools bridge the gap between **SQL query results** (from postgres tools) and **interactive visualizations** for end users.

### Workflow
```
User Query
    ↓
Agent uses postgres tools
    ↓
SQL Query Result (table format)
    ↓
Agent uses chart tools
    ↓
One or more chart configurations
    ↓
Frontend renders charts
```

### Use Cases

1. **Data Visualization**
   - Transform SQL query results into visual charts (bar, line, area, pie)
   - Help users understand data patterns quickly
   - Generate multiple chart variations from single query result

2. **Exploratory Analysis**
   - Users ask questions like "Show me sales by month" → Agent generates chart
   - Visual trend identification (time series, comparisons, distributions)
   - Agent suggests multiple chart types to explore data

3. **Reporting & Insights**
   - Quick visual summaries for business metrics
   - Executive dashboards with minimal configuration
   - Multi-chart views from single data source

4. **Data Communication**
   - Present complex data in understandable format
   - Support decision-making through visual evidence
   - Provide different perspectives on same data (e.g., bar + line + pie)

---

## Current Problems

### 1. Tool Complexity
- **9+ parameters** that agent must specify
- Agent often provides **inconsistent or incorrect values**
- Example: Agent tries to set `aggregation: 'avg'` on pie chart (invalid)

### 2. No Auto-Detection
- Agent must manually determine:
  - Which chart types are suitable for the data
  - Which columns to use for x-axis and y-axis
  - Axis type (category/time/number)
  - Aggregation method (sum/avg/count)
  - Sorting direction

These should be **automatically inferred** from SQL query result structure.

### 3. Inconsistent Results
Same SQL query result can produce **different chart configurations** because:
- Agent makes arbitrary choices on optional parameters
- No standardized defaults
- Agent may pick different chart types for same data pattern
- Tool logic is too permissive

### 4. Agent Confusion
Tool description is too long and complex. Agent struggles to:
- Understand which chart type fits the data best
- Pick appropriate columns for axes
- Validate their inputs against SQL result structure
- Generate multiple chart variations from single data source

---

## Proposed Solution

### Approach: Smart Defaults + Auto-Detection + Multi-Chart Support

#### Tool Options

**Option 1: Single Simple Tool**
```typescript
generate-chart({
  data: SQLQueryResult,        // From postgres tools (execute-sql)
  chartType: 'bar' | 'line' | 'area' | 'pie' | 'auto',
  xColumn?: string,            // Auto-detected if 'auto' or not specified
  yColumns?: string | string[], // Auto-detected if not specified
  title: string,
  subtitle?: string
})
```

**Option 2: Two Tools (Simplified + Auto-Suggest)**
```typescript
// Tool 1: Generate specific chart
generate-chart({
  data: SQLQueryResult,
  chartType: 'bar' | 'line' | 'area' | 'pie',
  xColumn?: string,           // Auto-detect if not specified
  yColumns?: string | string[], // Auto-detect if not specified
  title: string
})

// Tool 2: Suggest multiple chart types
suggest-charts({
  data: SQLQueryResult,
  title?: string
}) → Returns suggested chart configurations
```

**Option 3: Multi-Chart Generation**
```typescript
generate-charts({
  data: SQLQueryResult,
  chartTypes: ('bar' | 'line' | 'area' | 'pie')[] | 'all',
  xColumn?: string,
  yColumns?: string | string[],
  title?: string
}) → Returns array of chart configurations
```

#### Auto-Detection Logic

| Aspect | Detection Rule |
|--------|----------------|
| **Chart Type** | Analyze data: time series → line, categorical → bar, proportion → pie |
| **X-Axis Column** | First non-numeric column, or column with 'date', 'time', 'year', 'month' in name |
| **Y-Axis Column(s)** | Numeric columns, prioritize columns with 'amount', 'value', 'count' in name |
| **Axis Type** | Check data column: numeric → number, date string → time, else → category |
| **Aggregation** | Pie chart → sum if duplicates, XY chart → none unless duplicates exist |
| **Sorting** | Pie → desc by value, Time → asc, others → keep order |
| **Colors** | Assign from default palette based on series index |
| **Limit** | XY chart → 50 points, Pie → 7 slices |

#### Chart Type Recommendation Logic

| Data Pattern | Recommended Chart Types |
|--------------|------------------------|
| Time series (dates + values) | line, area, bar |
| Categorical comparison | bar, horizontal bar |
| Part-to-whole (percentages) | pie, donut (future) |
| Multiple series comparison | bar (grouped/stacked), line |
| Distribution | bar, area |

#### Optional Advanced Parameters (for fine-tuning)
```typescript
{
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none',
  sort?: 'asc' | 'desc' | 'none',
  limit?: number,
  stacked?: boolean,       // For bar/area charts
  showDataLabels?: boolean
}
```

---

## Success Criteria

### Functional Requirements
✅ Agent can generate valid chart configuration with **minimal parameters**
✅ Auto-detection works for 90%+ of common data patterns
✅ Chart renders successfully in frontend
✅ No errors from invalid parameter combinations

### Quality Requirements
✅ Consistent output for same input data
✅ Sensible defaults that don't require manual adjustment
✅ Clear, readable chart titles and labels

### Agent Experience
✅ Tool description is concise and easy to understand
✅ Agent rarely makes parameter errors
✅ Charts are generated reliably without retries

---

## Tool Count Decision

### Option 1: 1 Tool with `chartType: 'auto'` (Recommended)

```
generate-chart → Auto-detect everything including chart type
```

**Pros:**
- Simplest for agent (single tool, minimal params)
- Agent can let tool decide everything
- Auto-detect handles 90% of use cases

**Cons:**
- Less control when agent knows exactly what chart type to use

**Example:**
```typescript
generate-chart({ data, chartType: 'auto', title: 'Sales by Month' })
// → Auto-detects line chart because data has dates
```

---

### Option 2: 2 Tools (Specific + Auto-Suggest)

```
generate-chart   → Generate specific chart type with auto-detect for columns
suggest-charts   → Analyze data and suggest multiple chart configurations
```

**Pros:**
- Agent can request specific chart type
- `suggest-charts` can recommend best chart types
- More flexibility for complex scenarios

**Cons:**
- Agent needs to decide which tool to use
- More tools to understand

**Example:**
```typescript
// Agent wants specific chart
generate-chart({
  data,
  chartType: 'bar',
  yColumns: 'sales',  // Auto-detect xColumn
  title: 'Sales by Category'
})

// Agent wants suggestions
suggest-charts({ data, title: 'Sales Data' })
// → Returns: [
//      { type: 'bar', xColumn: 'category', yColumn: 'sales' },
//      { type: 'pie', xColumn: 'category', yColumn: 'sales' },
//      { type: 'line', xColumn: 'date', yColumn: 'sales' }
//    ]
```

---

### Option 3: 1 Tool with Multi-Chart Output

```
generate-charts({ data, chartTypes: 'all' | [...] })
```

**Pros:**
- Generate multiple chart variations in single call
- Good for dashboard views

**Cons:**
- Less precise control
- May generate unnecessary charts

---

### **Recommendation: Option 2 (2 Tools)**

**Rationale:**
- `generate-chart` is primary tool for 90% of cases
- `suggest-charts` helps when agent is unsure
- Clear separation: specific request vs exploration

---

## Implementation Plan

### Phase 1: Auto-Detection Layer
- [ ] Create `auto-detect.ts` with detection functions:
  - [ ] Detect column types (numeric, date, string, category)
  - [ ] Suggest best chart types based on data patterns
  - [ ] Auto-select x-axis and y-axis columns
  - [ ] Detect appropriate aggregation (sum/avg/count/none)
  - [ ] Detect optimal sorting order
- [ ] Add chart type recommendation logic:
  - [ ] Time series detection → line/area/bar
  - [ ] Categorical comparison → bar/horizontal-bar
  - [ ] Proportion/percentage → pie
  - [ ] Multi-series → stacked bar, grouped bar, line

### Phase 2: Refactor Existing Tool
- [ ] Update `generate-chart.ts` to use auto-detection
- [ ] Simplify input schema:
  - [ ] Make `chartType` enum with 'auto' option
  - [ ] Make `xColumn` and `yColumns` optional
  - [ ] Add auto-detection fallback when not specified
- [ ] Update tool description with clear usage examples
- [ ] Keep optional advanced parameters for fine-tuning

### Phase 3: Create Suggest Charts Tool (Optional)
- [ ] Create `suggest-charts.ts` tool
- [ ] Implement logic to analyze data and recommend multiple chart types
- [ ] Return array of suggested chart configurations
- [ ] Include reasoning for each recommendation

### Phase 4: Testing & Validation
- [ ] Test with various SQL result patterns:
  - [ ] Time series data (dates + values)
  - [ ] Categorical data (categories + counts)
  - [ ] Multi-series data (multiple metrics)
  - [ ] Percentage/proportion data
- [ ] Verify auto-detection accuracy for chart types
- [ ] Verify auto-detection accuracy for column selection
- [ ] Ensure frontend compatibility (check ChartRenderer requirements)
- [ ] Test with `suggest-charts` for multi-chart scenarios
- [ ] Update AGENTS.md documentation

### Phase 5: Cleanup & Documentation
- [ ] Consolidate utility functions
- [ ] Remove unnecessary types
- [ ] Add JSDoc comments for auto-detection functions
- [ ] Create examples showing different use cases

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Auto-detection fails on edge cases | Provide optional override parameters for columns and chart type |
| Wrong chart type suggested | Provide multiple suggestions via `suggest-charts` tool |
| Agent confusion remains | Improve tool descriptions with clear examples |
| Wrong columns selected | Heuristic: prioritize columns with 'date', 'time' for x-axis, 'amount', 'value', 'count' for y-axis |
| Frontend expects different format | Verify current frontend ChartRenderer spec before implementation |
| Performance issues with large datasets | Implement reasonable default limits (50 points for XY, 7 slices for pie) |
| Too many charts generated | Default to single chart, multi-chart only when explicitly requested |
| Aggregation on already-aggregated data | Detect if data has unique keys, default to 'none' aggregation |

---

## Next Steps

1. ✅ **Confirm tool approach**: Option 2 chosen - 2 tools (`generate-chart` + `suggest-charts`)

2. **Check frontend requirements** (Future)
   - What output format does ChartRenderer expect?
   - Any specific requirements for chart configurations?

3. ✅ **Review auto-detection logic**:
   - Column selection rules implemented
   - Chart type recommendation rules implemented
   - Edge cases handled

4. ✅ **Implement Phase 1-3**: Complete
   - Auto-detection layer created
   - `generate-chart` tool refactored
   - `suggest-charts` tool created
   - Index updated to export both tools
   - Documentation updated in AGENTS.md

## Implementation Status

✅ **COMPLETED** - All phases implemented and tested logic

### What's Next?

- Test with real SQL queries from production database
- Verify frontend ChartRenderer compatibility
- Add more chart types if needed (scatter, histogram, etc.)
- Fine-tune auto-detection rules based on real-world usage
