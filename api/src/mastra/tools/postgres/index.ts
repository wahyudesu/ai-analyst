export { executeSQLTool } from './execute-sql.js';
export { listTablesTool } from './list-tables.js';
export { getTableSchemaTool } from './get-table-schema.js';

import { executeSQLTool } from './execute-sql.js';
import { listTablesTool } from './list-tables.js';
import { getTableSchemaTool } from './get-table-schema.js';

export const postgresTools = {
  executeSQL: executeSQLTool,
  listTables: listTablesTool,
  getTableSchema: getTableSchemaTool,
};
