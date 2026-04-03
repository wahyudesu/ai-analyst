import {
  createAnswerRelevancyScorer,
  createFaithfulnessScorer,
} from "@mastra/evals/scorers/prebuilt"
import { z } from "zod"
import { mastra } from "../index"

const inputSchema = z.object({
  question: z.string(),
  expectedSql: z.string().optional(),
  context: z.string().optional(),
})

const outputSchema = z.object({
  sql: z.string(),
  explanation: z.string().optional(),
})

const dataset = await mastra.datasets.create({
  name: "experiment",
  description: "A dataset for data analyst examples",
  inputSchema,
  outputSchema,
})

await dataset.addItems({
  items: [
    {
      input: {
        question: "Show me all users who registered in the last 7 days",
        context: "Table: users(id, name, email, created_at)",
      },
      output: {
        sql: "SELECT * FROM users WHERE created_at >= NOW() - INTERVAL '7 days'",
        explanation:
          "Query filters users by registration date within last 7 days",
      },
    },
    {
      input: {
        question: "What is the total revenue by month?",
        context: "Table: orders(id, total, created_at)",
      },
      output: {
        sql: "SELECT DATE_TRUNC('month', created_at) as month, SUM(total) as revenue FROM orders GROUP BY month ORDER BY month",
        explanation: "Aggregates orders by month and sums the total revenue",
      },
    },
  ],
})
