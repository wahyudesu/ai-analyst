import { analyzeResultsTool } from "./analyze-results.js"
import { executeSQLTool } from "./execute-sql.js"
import { explainQueryTool } from "./explain-query.js"
import { getSchemaTool } from "./get-schema.js"
import { getTableTool } from "./get-table.js"

export const postgresTools = {
  executeSQL: executeSQLTool,
  getSchema: getSchemaTool,
  getTable: getTableTool,
  explainQuery: explainQueryTool,
  analyzeResults: analyzeResultsTool,
} as const

export {
  executeSQLTool,
  getSchemaTool,
  getTableTool,
  explainQueryTool,
  analyzeResultsTool,
}
