/**
 * Centralized Error Handling
 *
 * Provides structured error responses with helpful messages
 */

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    technical?: string;
    suggestion?: string;
    fixable?: boolean;
    context?: Record<string, unknown>;
  };
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data?: T;
}

export type ApiResponse<T = unknown> = ErrorResponse | SuccessResponse<T>;

/**
 * Error codes with their friendly messages and suggestions
 */
export const ERROR_CODES: Record<string, { message: string; suggestion?: string; fixable?: boolean }> = {
  // Database Connection Errors
  'DB_CONNECTION_FAILED': {
    message: 'Could not connect to the database',
    suggestion: 'Check your database URL and ensure the database is accessible',
    fixable: true,
  },
  'DB_TIMEOUT': {
    message: 'Database connection timeout',
    suggestion: 'The database may be in sleep mode or there may be network issues',
    fixable: true,
  },
  'DB_HOST_NOT_FOUND': {
    message: 'Database host not found',
    suggestion: 'Verify the hostname in your connection string',
    fixable: true,
  },
  'DB_CONNECTION_REFUSED': {
    message: 'Connection refused by database',
    suggestion: 'Check if the database is running and accessible',
    fixable: true,
  },
  'DB_DOES_NOT_EXIST': {
    message: 'Database does not exist',
    suggestion: 'Check the database name in your connection string',
    fixable: true,
  },
  'DB_SSL_ERROR': {
    message: 'SSL certificate error',
    suggestion: 'For Neon/Supabase, try using non-pooled connection or check SSL configuration',
    fixable: true,
  },

  // SQL Errors
  'SQL_INVALID': {
    message: 'Invalid SQL query',
    suggestion: 'Check your query syntax',
    fixable: true,
  },
  'SQL_NO_SELECT': {
    message: 'Only SELECT queries are allowed',
    suggestion: 'Use SELECT to read data. INSERT, UPDATE, DELETE are not permitted',
    fixable: false,
  },
  'SQL_INJECTION_DETECTED': {
    message: 'Query contains suspicious patterns',
    suggestion: 'Review your query for potential SQL injection patterns',
    fixable: true,
  },
  'SQL_MULTI_STATEMENT': {
    message: 'Multi-statement queries are not allowed',
    suggestion: 'Split into separate queries',
    fixable: true,
  },
  'SQL_EXCESSIVE_JOINS': {
    message: 'Query has too many JOINs',
    suggestion: 'Consider breaking into multiple queries or using subqueries',
    fixable: true,
  },
  'SQL_DEEP_NESTING': {
    message: 'Query has too many nested subqueries',
    suggestion: 'Use CTEs (WITH clause) to simplify or break into multiple queries',
    fixable: true,
  },
  'SQL_INVALID_COLUMN': {
    message: 'Column does not exist',
    suggestion: 'Check the column name using getSchema or getTable tools',
    fixable: true,
  },
  'SQL_INVALID_TABLE': {
    message: 'Table does not exist',
    suggestion: 'Check available tables using getSchema tool',
    fixable: true,
  },
  'SQL_SYNTAX_ERROR': {
    message: 'SQL syntax error',
    suggestion: 'Check for missing quotes, commas, or balanced parentheses',
    fixable: true,
  },

  // Chart Errors
  'CHART_NO_DATA': {
    message: 'No data to visualize',
    suggestion: 'Ensure your query returns results. Try adding data or adjusting filters',
    fixable: true,
  },
  'CHART_NO_NUMERIC_COLUMN': {
    message: 'No numeric column found for visualization',
    suggestion: 'Rewrite query with aggregations: COUNT(*), SUM(column), AVG(column), etc.',
    fixable: true,
  },
  'CHART_NO_CATEGORY_COLUMN': {
    message: 'No category column found for x-axis',
    suggestion: 'Ensure your query has a string or date column for grouping',
    fixable: true,
  },
  'CHART_TOO_MANY_CATEGORIES': {
    message: 'Too many categories for this chart type',
    suggestion: 'Add LIMIT or GROUP BY to reduce categories',
    fixable: true,
  },

  // Auth Errors
  'AUTH_MISSING_CREDENTIALS': {
    message: 'Email and password are required',
    suggestion: 'Provide both email and password',
    fixable: true,
  },
  'AUTH_INVALID_CREDENTIALS': {
    message: 'Invalid email or password',
    suggestion: 'Check your credentials and try again',
    fixable: true,
  },
  'AUTH_TOKEN_MISSING': {
    message: 'Authentication token required',
    suggestion: 'Login to get an authentication token',
    fixable: true,
  },
  'AUTH_TOKEN_INVALID': {
    message: 'Invalid or expired authentication token',
    suggestion: 'Login again to get a new token',
    fixable: true,
  },

  // Agent Errors
  'AGENT_NOT_FOUND': {
    message: 'Agent not found',
    suggestion: 'Check available agents',
    fixable: false,
  },
  'AGENT_EXECUTION_FAILED': {
    message: 'Agent execution failed',
    suggestion: 'Try simplifying your request or contact support',
    fixable: false,
  },
};

/**
 * Create a structured error response
 */
export function createError(
  code: string,
  technical?: string,
  context?: Record<string, unknown>
): ErrorResponse {
  const errorDef = ERROR_CODES[code] || {
    message: 'An error occurred',
    suggestion: 'Try again or contact support',
  };

  return {
    success: false,
    error: {
      code,
      message: errorDef.message,
      technical,
      suggestion: errorDef.suggestion,
      fixable: errorDef.fixable,
      context,
    },
  };
}

/**
 * Create a database error from a pg error
 */
export function createDatabaseError(error: any): ErrorResponse {
  const message = error?.message || '';
  const code = error?.code || '';

  // Map common error codes
  if (code === 'ETIMEDOUT' || message.includes('timeout')) {
    return createError('DB_TIMEOUT', message);
  }
  if (code === 'ENOTFOUND' || message.includes('getaddrinfo')) {
    return createError('DB_HOST_NOT_FOUND', message);
  }
  if (code === 'ECONNREFUSED') {
    return createError('DB_CONNECTION_REFUSED', message);
  }
  if (code === '3D000' || message.includes('database') && message.includes('does not exist')) {
    return createError('DB_DOES_NOT_EXIST', message);
  }
  if (message.includes('certificate') || message.includes('SSL')) {
    return createError('DB_SSL_ERROR', message);
  }

  return createError('DB_CONNECTION_FAILED', message);
}

/**
 * Create a SQL error from a query error
 */
export function createSQLError(error: any, query?: string): ErrorResponse {
  const message = error?.message || '';
  const code = error?.code || '';

  // Check for specific SQL errors
  if (message.includes('column') && message.includes('does not exist')) {
    const match = message.match(/column "([^"]+)"/);
    const column = match?.[1];
    return createError('SQL_INVALID_COLUMN', message, { column, query });
  }
  if (message.includes('relation') && message.includes('does not exist')) {
    const match = message.match(/relation "([^"]+)"/);
    const table = match?.[1];
    return createError('SQL_INVALID_TABLE', message, { table, query });
  }
  if (code === '42601' || message.includes('syntax error')) {
    return createError('SQL_SYNTAX_ERROR', message, { query });
  }

  return createError('SQL_INVALID', message, { query });
}

/**
 * Create a chart error
 */
export function createChartError(
  code: string,
  context?: Record<string, unknown>
): ErrorResponse {
  return createError(code, undefined, context);
}

/**
 * Create a success response
 */
export function createSuccess<T>(data?: T): SuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Format error for agent response (natural language)
 */
export function formatErrorForAgent(errorResponse: ErrorResponse): string {
  const { error } = errorResponse;
  let message = `Error: ${error.message}`;

  if (error.suggestion) {
    message += `\n\nSuggestion: ${error.suggestion}`;
  }

  if (error.technical) {
    message += `\n\nTechnical details: ${error.technical}`;
  }

  return message;
}

/**
 * Check if an error is fixable by the agent
 */
export function isFixableError(errorResponse: ErrorResponse): boolean {
  return errorResponse.error.fixable === true;
}
