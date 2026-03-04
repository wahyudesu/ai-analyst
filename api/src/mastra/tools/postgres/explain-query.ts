/**
 * Query Explanation Tool
 * Analyzes and explains SQL queries in natural language
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const explainQueryTool = createTool({
  id: "explain-query",
  description: `Analyze and explain a SQL query in natural language.

This tool breaks down what a SQL query does:
- What data it retrieves
- How tables are joined
- What filters are applied
- What aggregations are used
- Estimated performance

Use this after generating a query to help users understand what will happen.`,
  inputSchema: z.object({
    query: z.string().describe("The SQL query to explain"),
  }),
  execute: async ({ query }) => {
    const explanation: string[] = [];
    const upperQuery = query.toUpperCase();

    // Identify the main operation
    if (upperQuery.includes("SELECT")) {
      explanation.push("**This is a SELECT query** - it retrieves data from the database.");
    }

    // Identify tables
    const fromMatches = query.matchAll(/FROM\s+([^\s,]+)/gi);
    const tables = Array.from(fromMatches).map(m => m[1]);
    if (tables.length > 0) {
      explanation.push(`**Tables accessed:** ${tables.join(", ")}`);
    }

    // Identify JOINs
    const joinCount = (query.match(/JOIN/gi) || []).length;
    if (joinCount > 0) {
      explanation.push(`**Joins:** ${joinCount} table(s) joined together.`);
    }

    // Identify WHERE clause
    if (upperQuery.includes("WHERE")) {
      explanation.push("**Filtering:** Results are filtered using WHERE clause.");
    }

    // Identify aggregations
    const aggregations = [];
    if (upperQuery.includes("COUNT(")) aggregations.push("COUNT");
    if (upperQuery.includes("SUM(")) aggregations.push("SUM");
    if (upperQuery.includes("AVG(")) aggregations.push("AVG");
    if (upperQuery.includes("MIN(")) aggregations.push("MIN");
    if (upperQuery.includes("MAX(")) aggregations.push("MAX");

    if (aggregations.length > 0) {
      explanation.push(`**Aggregations:** ${aggregations.join(", ")} - calculates summary values.`);
    }

    // Identify GROUP BY
    if (upperQuery.includes("GROUP BY")) {
      explanation.push("**Grouping:** Results are grouped by one or more columns.");
    }

    // Identify ORDER BY
    if (upperQuery.includes("ORDER BY")) {
      explanation.push("**Sorting:** Results are sorted.");
    }

    // Identify LIMIT
    const limitMatch = query.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      explanation.push(`**Limit:** Returns at most ${limitMatch[1]} rows.`);
    }

    // Estimate complexity
    let complexity = "low";
    let reasons = [];

    if (joinCount > 2) {
      complexity = "medium";
      reasons.push("multiple joins");
    }
    if (aggregations.length > 0 && upperQuery.includes("GROUP BY")) {
      complexity = "medium";
      reasons.push("aggregation with grouping");
    }
    if (joinCount > 3 || (aggregations.length > 0 && upperQuery.includes("ORDER BY"))) {
      complexity = "high";
      reasons = joinCount > 3
        ? ["many joins"]
        : ["aggregation with sorting"];
    }

    explanation.push(`\n**Estimated complexity:** ${complexity}`);

    // Provide suggestions
    const suggestions = [];
    if (!limitMatch && !upperQuery.includes("LIMIT")) {
      suggestions.push("Consider adding LIMIT to prevent large result sets.");
    }
    if (upperQuery.includes("SELECT *")) {
      suggestions.push("Consider specifying explicit columns instead of SELECT * for better performance.");
    }
    if (joinCount > 0 && !upperQuery.includes("ON")) {
      suggestions.push("Make sure JOIN conditions are properly specified.");
    }

    if (suggestions.length > 0) {
      explanation.push("\n**Suggestions:**");
      suggestions.forEach(s => explanation.push(`- ${s}`));
    }

    return {
      query,
      explanation: explanation.join("\n"),
      complexity,
      tables,
      joinCount,
      aggregations,
    };
  },
});
