import { executeSQLTool } from "./execute-sql.js"
import { getSchemaTool } from "./get-schema.js"
import { getTableTool } from "./get-table.js"
import { explainQueryTool } from "./explain-query.js"
import { analyzeResultsTool } from "./analyze-results.js"

export const postgresTools = {
  executeSQL: executeSQLTool,
  getSchema: getSchemaTool,
  getTable: getTableTool,
  explainQuery: explainQueryTool,
  analyzeResults: analyzeResultsTool,
} as const

export { executeSQLTool, getSchemaTool, getTableTool, explainQueryTool, analyzeResultsTool }
