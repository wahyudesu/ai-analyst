/**
 * Test PostgreSQL & Chart Tools
 *
 * Run: SKIP_DB_TESTS=true node_modules/.bin/tsx src/mastra/tools/__tests__/postgres-tools.test.ts
 */

import { connectionManager } from "../../../db/connection-manager.js"

const SKIP_DB_TESTS = process.env.SKIP_DB_TESTS === 'true'
const TEST_CONNECTION_STRING = process.env.DATABASE_URL || ""

const colors = { reset: "\x1b[0m", green: "\x1b[32m", red: "\x1b[31m", blue: "\x1b[34m" }

function log(msg: string, color: keyof typeof colors = "reset") {
  console.log(`${colors[color]}${msg}${colors.reset}`)
}

async function run() {
  log("\n🧪 Tools Test", "blue")

  let passed = 0, failed = 0

  // Test 1: get-schema
  try {
    if (SKIP_DB_TESTS) {
      log("✓ get-schema (skipped)", "green")
      passed++
    } else {
      const { getSchemaTool } = await import("../postgres/index.js")
      const result = await getSchemaTool.execute({ connectionString: TEST_CONNECTION_STRING, schema: "public" })
      if (result && "tables" in result) {
        log(`✓ get-schema (${result.tables?.length || 0} tables)`, "green")
        passed++
      } else {
        throw new Error("No tables returned")
      }
    }
  } catch (err) {
    failed++
    log(`✗ get-schema: ${err instanceof Error ? err.message : err}`, "red")
  }

  // Test 2: generate-chart
  try {
    const { generateChartTool } = await import("../charts/index.js")
    const data = {
      columns: ["month", "sales"],
      rows: [
        { month: "Jan", sales: 1000 },
        { month: "Feb", sales: 1200 },
        { month: "Mar", sales: 900 }
      ],
      rowCount: 3
    }
    const result = await generateChartTool.execute({ data, chartType: "bar", title: "Sales" })
    if (result.chartType === "bar" && result.data?.series?.[0]?.data?.length === 3) {
      log("✓ generate-chart (bar, 3 data points)", "green")
      passed++
    } else {
      throw new Error("Chart generation failed")
    }
  } catch (err) {
    failed++
    log(`✗ generate-chart: ${err instanceof Error ? err.message : err}`, "red")
  }

  log(`\nPassed: ${passed} | Failed: ${failed}`, failed ? "red" : "green")
  await connectionManager.closeAll()
  process.exit(failed ? 1 : 0)
}

run().catch(() => process.exit(1))
