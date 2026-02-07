import { executeSQLTool } from "./execute-sql.js"
import { getSchemaTool } from "./get-schema.js"
import { getTableTool } from "./get-table.js"

export const postgresTools = {
  executeSQL: executeSQLTool,
  getSchema: getSchemaTool,
  getTable: getTableTool,
} as const

export { executeSQLTool, getSchemaTool, getTableTool }
