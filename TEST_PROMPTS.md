# Test Prompts for Data Analyst Agent

## Test Prompt 1: Basic Data Exploration
Test postgres tools (list tables, get schema) and simple query.

```
Show me the available tables in the database and tell me what data they contain.
```

**Expected:**
- Agent calls `list-tables` tool
- Agent calls `get-table-schema` for interesting tables
- Natural language explanation of table structures
- No chart generation

---

## Test Prompt 2: Time Series Visualization
Test time series data with line/area chart and auto-detection.

```
Generate a line chart showing sales trend over the last 12 months. Use the sales data from the database.
```

**Expected:**
- Agent calls `execute-sql` with GROUP BY month query
- Agent uses `generate-chart` with `chartType: 'line'`
- Auto-detects x-axis (month/date column)
- Auto-detects y-axis (sales/amount column)
- Natural language explanation of the trend
- Returns SQL result table + chart configuration

---

## Test Prompt 3: Categorical Comparison
Test categorical data with bar chart and auto-detection.

```
Create a bar chart comparing sales by product category. Show top 10 categories by revenue.
```

**Expected:**
- Agent calls `execute-sql` with ORDER BY and LIMIT
- Agent uses `generate-chart` with `chartType: 'bar'`
- Auto-detects x-axis (category column)
- Auto-detects y-axis (revenue/amount column)
- Auto-detects sorting (descending by value)
- Natural language summary
- Returns SQL result + chart configuration

---

## Test Prompt 4: Pie Chart for Proportions
Test pie chart for part-to-whole relationships.

```
Show me a pie chart displaying the revenue distribution across different regions. Use a title that describes the distribution.
```

**Expected:**
- Agent calls `execute-sql` with GROUP BY region
- Agent uses `generate-chart` with `chartType: 'pie'`
- Auto-detects slices (region column)
- Auto-detects values (revenue/sum column)
- Auto-applies aggregation (sum)
- Auto-sorts by value descending
- Returns SQL result + chart configuration with 7 or fewer slices

---

## Test Prompt 5: Multi-Chart Analysis
Test suggest-charts tool for multiple chart types from single data.

```
Analyze the monthly sales data and suggest different chart types to visualize it. Generate all suggested charts.
```

**Expected:**
- Agent calls `execute-sql` to get monthly data
- Agent uses `suggest-charts` tool
- Returns 2-4 chart configurations:
  - Line chart (trend over time)
  - Bar chart (month-by-month comparison)
  - Area chart (volume/magnitude)
  - Pie chart (proportion of each month) if few enough categories
- Each chart has reasoning for why that chart type is appropriate
- Natural language explanation of each chart's purpose

---

## Test Prompt 6: Explicit Column Selection
Test generate-chart with manually specified columns.

```
Create an area chart using the 'created_at' column for x-axis and 'total_amount' column for y-axis. Title it "Customer Acquisition Trend".
```

**Expected:**
- Agent calls `execute-sql` with appropriate query
- Agent uses `generate-chart` with:
  - `chartType: 'area'`
  - `xColumn: 'created_at'` (explicit)
  - `yColumns: 'total_amount'` (explicit)
  - `title: 'Customer Acquisition Trend'`
- Agent respects explicit column names
- Auto-detects axis type (time for created_at)
- Returns chart configuration

---

## Test Prompt 7: Error Handling - Invalid Chart Type
Test how agent handles invalid chart combinations.

```
Try to create a pie chart for time series data with hundreds of unique dates.
```

**Expected:**
- Agent recognizes this is not optimal for pie chart
- Agent either:
  a) Warns that pie chart is not suitable (too many categories)
  b) Falls back to more appropriate chart type (bar/line)
- Agent provides reasoning for chart type selection

---

## Test Prompt 8: Complex Query + Aggregation
Test with aggregated SQL results.

```
Show me a chart comparing total sales, average order value, and order count by quarter for the current year.
```

**Expected:**
- Agent calls `execute-sql` with multiple aggregations:
  - SUM(sales) as total
  - AVG(order_value) as avg_value
  - COUNT(*) as order_count
  - GROUP BY quarter
- Agent uses `generate-chart` with multiple y-columns:
  - `yColumns: ['total', 'avg_value', 'order_count']`
- Auto-detects x-axis (quarter)
- Generates bar chart with 3 series
- Returns chart with multi-series data

---

## Test Prompt 9: Auto-Detection Verification
Test auto-detection with different data patterns.

```
Query the database for order data and create a visualization. Let the tools decide the best chart type and columns to use.
```

**Expected:**
- Agent calls `execute-sql` (maybe SELECT * FROM orders LIMIT 100)
- Agent calls `generate-chart` without specifying:
  - `xColumn` - should auto-detect from date/time columns
  - `yColumns` - should auto-detect from numeric/value columns
  - `chartType` - should infer from data pattern
- Agent explains what auto-detection chose and why

---

## Test Prompt 10: Specific Chart Types Filter
Test suggest-charts with specific chart type filter.

```
Use the order history data to generate only bar and pie charts showing order distribution by status.
```

**Expected:**
- Agent calls `execute-sql` with GROUP BY status
- Agent calls `suggest-charts` with `chartTypes: ['bar', 'pie']`
- Returns exactly 2 charts (bar and pie)
- No line or area charts generated
- Bar chart shows order counts by status
- Pie chart shows proportion of each status

---

## Test Prompt 11: Missing Column Handling
Test how agent handles when auto-detection fails.

```
Query a table that has only string columns and try to create a chart.
```

**Expected:**
- Agent calls `execute-sql` (returns string data)
- Agent calls `generate-chart`
- Auto-detection fails to find numeric y-column
- Agent either:
  a) Returns error explaining why (no numeric column found)
  b) Asks user to specify column explicitly

---

## Test Prompt 12: Edge Case - Empty Result
Test with SQL query that returns no data.

```
Show me a chart of sales for a product that doesn't exist (e.g., product_id = 99999).
```

**Expected:**
- Agent calls `execute-sql` (returns 0 rows)
- Agent either:
  a) Warns that no data was returned
  b) Still generates chart (empty/placeholder) with appropriate message
  c) Explains that chart will be empty

---

## Test Prompt 13: Limiting Data Points
Test with data that should be limited.

```
Create a line chart showing daily sales for the past year. The data will have 365+ data points.
```

**Expected:**
- Agent calls `execute-sql` (returns 365 rows)
- Agent uses `generate-chart` with default limit (50)
- Chart shows first 50 data points
- Agent mentions that data was limited to 50 points for readability
- Optional: Agent can specify `limit: 100` to show more

---

## Test Prompt 14: Stacked Bar Chart
Test with stacked option.

```
Create a stacked bar chart showing monthly revenue broken down by product category.
```

**Expected:**
- Agent calls `execute-sql` with:
  - GROUP BY month, category
- Agent uses `generate-chart` with:
  - `chartType: 'bar'`
  - `stacked: true`
- Auto-detects x-axis (month)
- Multiple y-series (one per category)
- Chart shows stacked bars with categories
- Natural language explains the breakdown

---

## Test Prompt 15: Interactive Exploration
Test multi-step workflow with suggestions.

```
First, show me the order trends over time using a line chart.
Then, create a pie chart showing the distribution of order statuses.
Finally, suggest the best visualization approach for customer lifetime value data.
```

**Expected:**
- Agent performs 3 separate operations:
  1. Line chart for order trends (uses `execute-sql` + `generate-chart`)
  2. Pie chart for status distribution (uses `execute-sql` + `generate-chart`)
  3. Analysis/suggestion for CLV data (uses `suggest-charts`)
- Agent provides context between each step
- Natural language flow connects the visualizations

---

## Testing Checklist

For each prompt, verify:
- [ ] Agent uses correct postgres tool (execute-sql/list-tables/get-table-schema)
- [ ] SQL query is syntactically correct
- [ ] Agent calls appropriate chart tool (generate-chart/suggest-charts)
- [ ] Chart type matches data pattern (time series → line, category → bar, proportion → pie)
- [ ] Auto-detection selects correct columns (date/time for x-axis, numeric for y-axis)
- [ ] Chart configuration has all required fields (chartType, title, data, xAxis, yAxis, colors, metadata)
- [ ] Natural language response explains the visualization
- [ ] Agent provides insights/summary from the data
- [ ] Error handling is appropriate (missing columns, no data, etc.)

---

## Scenarios Covered

| Scenario | Prompt | Tools Used |
|-----------|---------|-------------|
| Basic exploration | 1 | list-tables, get-table-schema |
| Time series | 2, 9 | execute-sql, generate-chart |
| Categorical | 3, 10 | execute-sql, generate-chart |
| Proportion/Pie | 4 | execute-sql, generate-chart |
| Multi-chart | 5, 15 | execute-sql, suggest-charts |
| Explicit columns | 6, 14 | execute-sql, generate-chart |
| Error handling | 7 | generate-chart (fallback) |
| Complex aggregation | 8 | execute-sql, generate-chart |
| Auto-detection | 9 | execute-sql, generate-chart |
| Chart type filter | 10 | execute-sql, suggest-charts |
| Missing columns | 11 | execute-sql, generate-chart |
| Empty data | 12 | execute-sql, generate-chart |
| Data limiting | 13 | execute-sql, generate-chart |
| Stacked charts | 14 | execute-sql, generate-chart |
| Interactive workflow | 15 | execute-sql, generate-chart, suggest-charts |
