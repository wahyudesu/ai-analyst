// /**
//  * AI Analyst Experiment Runner
//  *
//  * Create dataset and run experiments using Mastra's built-in experiment framework
//  *
//  * Usage:
//  *   pnpm tsx scripts/init-dataset.ts          # Create dataset
//  *   pnpm tsx scripts/init-dataset.ts run      # Run experiments
//  *   pnpm tsx scripts/init-dataset.ts list     # List experiments
//  */

// import {
//   createAnswerRelevancyScorer,
//   createFaithfulnessScorer,
// } from "@mastra/evals/scorers/prebuilt"
// import { mastra } from "../index"

// const DB_URL =
//   process.env.DATABASE_URL ||
//   "postgresql://postgres:postgres@localhost:5432/ai_analyst"

// // Experiment scenarios from TEST_PROMPTS.md
// const EXPERIMENT_ITEMS = [
//   {
//     input:
//       "Show me the available tables in the database and tell me what data they contain.",
//     expected: "Agent should call getSchema and getTable tools",
//   },
//   {
//     input: "Generate a line chart showing sales trend over the last 12 months.",
//     expected:
//       "Agent should execute SQL with GROUP BY month and generate line chart",
//   },
//   {
//     input:
//       "Create a bar chart comparing sales by product category. Show top 10 categories by revenue.",
//     expected: "Agent should generate bar chart with top 10 categories",
//   },
//   {
//     input:
//       "Show me a pie chart displaying the revenue distribution across different regions.",
//     expected: "Agent should generate pie chart for regional revenue",
//   },
//   {
//     input:
//       "Analyze the monthly sales data and suggest different chart types to visualize it.",
//     expected:
//       "Agent should use suggestCharts to provide multiple chart options",
//   },
//   {
//     input:
//       "Query the database for order data and create a visualization. Let the tools decide the best chart type.",
//     expected: "Agent should auto-detect appropriate chart type based on data",
//   },
//   {
//     input:
//       "Show me a chart comparing total sales, average order value, and order count by quarter.",
//     expected: "Agent should create chart with multiple metrics (aggregation)",
//   },
//   {
//     input:
//       "Create a stacked bar chart showing monthly revenue broken down by product category.",
//     expected: "Agent should generate stacked bar chart with breakdown",
//   },
// ]

// /**
//  * Create or update dataset with experiment items
//  */
// async function createDataset() {
//   console.log("📊 Creating dataset...")

//   const dataset = await mastra.datasets.create({
//     name: "data-analyst-experiments",
//     description: "Test scenarios for AI data analyst agent",
//   })

//   // Add items separately
//   await dataset.addItems({
//     items: EXPERIMENT_ITEMS.map(item => ({
//       input: item.input,
//       groundTruth: { expected: item.expected },
//     })),
//   })

//   // Get item count (listItems returns paginated result when version not specified)
//   const result = await dataset.listItems({ perPage: 100 })
//   const items = Array.isArray(result) ? result : result.items

//   console.log(`✅ Dataset created: ${dataset.id}`)
//   console.log(`📋 Items: ${items.length}`)

//   return dataset
// }

// /**
//  * Run experiments against the data analyst agent
//  */
// async function runExperiments() {
//   console.log("🧪 Running experiments...")

//   // Get the dataset by name (need full Dataset instance, not DatasetRecord)
//   const datasets = await mastra.datasets.list({ perPage: 20 })
//   const datasetRecord = datasets.datasets.find(
//     d => d.name === "data-analyst-experiments"
//   )

//   if (!datasetRecord) {
//     console.log(
//       "❌ Dataset not found. Run without 'run' command to create it first."
//     )
//     return
//   }

//   // Get full Dataset instance to access startExperiment
//   const dataset = await mastra.datasets.get({ id: datasetRecord.id })
//   const details = await dataset.getDetails()
//   const listResult = await dataset.listItems({ perPage: 100 })
//   const items = Array.isArray(listResult) ? listResult : listResult.items

//   console.log(`📋 Dataset: ${details.name} (${items.length} items)`)

//   // Set database URL for tools
//   const { AsyncLocalStorage } = await import("node:async_hooks")
//   const storage = new AsyncLocalStorage<Map<string, string>>()

//   await storage.run(new Map([["databaseUrl", DB_URL]]), async () => {
//     // Run experiment with scorers
//     const summary = await dataset.startExperiment({
//       name: `data-analyst-${Date.now()}`,
//       targetType: "agent",
//       targetId: "data-analyst",
//       scorers: [
//         createAnswerRelevancyScorer({
//           model: { id: "zai/GLM-5", url: "https://api.z.ai/api/paas/v4/" },
//         }),
//         createFaithfulnessScorer({
//           model: { id: "zai/GLM-5", url: "https://api.z.ai/api/paas/v4/" },
//         }),
//       ],
//       maxConcurrency: 3,
//       itemTimeout: 60_000,
//     })

//     console.log(`\n${"=".repeat(60)}`)
//     console.log("📊 EXPERIMENT RESULTS")
//     console.log("=".repeat(60))
//     console.log(`Status: ${summary.status}`)
//     console.log(`Succeeded: ${summary.succeededCount}/${summary.totalItems}`)
//     console.log(`Failed: ${summary.failedCount}`)
//     console.log(
//       `Duration: ${
//         summary.completedAt && summary.startedAt
//           ? new Date(summary.completedAt).getTime() -
//             new Date(summary.startedAt).getTime()
//           : 0
//       }ms`
//     )

//     // Show per-item results
//     console.log("\n📋 Item Results:")
//     for (const result of summary.results) {
//       const item = EXPERIMENT_ITEMS.find(i => i.input === result.input)
//       console.log(`\n[${item?.input.slice(0, 50)}...]`)
//       const output = result.output as string | undefined
//       console.log(`  Output: ${output?.slice(0, 100)}...`)

//       for (const score of result.scores) {
//         console.log(
//           `  ${score.scorerName}: ${score.score?.toFixed(2) || "N/A"}`
//         )
//         if (score.reason)
//           console.log(`    Reason: ${score.reason.slice(0, 100)}...`)
//       }

//       if (result.error) {
//         console.log(`  ❌ Error: ${result.error}`)
//       }
//     }
//   })
// }

// /**
//  * List all experiments
//  */
// async function listExperiments() {
//   const datasets = await mastra.datasets.list({ perPage: 20 })
//   const datasetRecord = datasets.datasets.find(
//     d => d.name === "data-analyst-experiments"
//   )

//   if (!datasetRecord) {
//     console.log("❌ Dataset not found")
//     return
//   }

//   // Get full Dataset instance to access listExperiments
//   const dataset = await mastra.datasets.get({ id: datasetRecord.id })
//   const { experiments } = await dataset.listExperiments({ perPage: 10 })

//   console.log("\n📊 Experiments for 'data-analyst-experiments':\n")

//   for (const exp of experiments) {
//     const statusIcon =
//       exp.status === "completed" ? "✅" : exp.status === "failed" ? "❌" : "🔄"
//     console.log(
//       `${statusIcon} ${exp.name} — ${exp.status} (${exp.succeededCount}/${exp.totalItems})`
//     )
//     if (exp.startedAt)
//       console.log(`   Started: ${new Date(exp.startedAt).toISOString()}`)
//   }
// }

// /**
//  * Main
//  */
// const command = process.argv[2] || "create"

// switch (command) {
//   case "run":
//     await runExperiments()
//     break
//   case "list":
//     await listExperiments()
//     break
//   default:
//     await createDataset()
//     console.log(
//       "\n💡 Run 'pnpm tsx scripts/init-dataset.ts run' to execute experiments"
//     )
//     break
// }
