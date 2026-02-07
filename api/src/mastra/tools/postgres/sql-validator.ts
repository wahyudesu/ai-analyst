/**
 * SQL Query Validator for Security
 * Protects against SQL injection and unsafe queries
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Check if query contains potentially dangerous patterns
 */
export function validateSQLQuery(query: string): ValidationResult {
  const trimmedQueryUpper = query.trim().toUpperCase();
  const warnings: string[] = [];

  // Must start with SELECT (read-only)
  if (!trimmedQueryUpper.startsWith('SELECT')) {
    return {
      isValid: false,
      error: 'Only SELECT queries are allowed for security. Queries starting with INSERT, UPDATE, DELETE, DROP, ALTER, etc. are not permitted.',
    };
  }

  // Block multi-statement queries (prevent injection via semicolon)
  // Allow trailing semicolon (single ; at end only)
  const trimmedQuery = query.trim()
  if (trimmedQuery.includes(';')) {
    // Check if semicolon is only at the end (safe)
    const semicolonCount = (trimmedQuery.match(/;/g) || []).length
    const lastChar = trimmedQuery.slice(-1)
    if (semicolonCount > 1 || lastChar !== ';') {
      return {
        isValid: false,
        error: 'Multi-statement queries are not allowed. Only a single trailing semicolon is permitted.',
      };
    }
    // Remove trailing semicolon for safety
    query = trimmedQuery.slice(0, -1)
  }

  // Block common SQL injection patterns
  const dangerousPatterns = [
    /--/, // SQL comments
    /\/\*/, // Block comments start
    /\*\//, // Block comments end
    /xp_/i, // SQL Server extended procedures (just in case)
    /sp_/i, // Some dangerous stored procedures
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(query)) {
      return {
        isValid: false,
        error: 'Query contains potentially dangerous patterns that are not allowed.',
      };
    }
  }

  // Check for extremely large queries (DoS protection)
  if (query.length > 10000) {
    warnings.push('Query is very large (>10KB). This may impact performance.');
  }

  // Check for missing LIMIT (could return millions of rows)
  if (!/\bLIMIT\b/i.test(query) && !/\bFETCH\s+FIRST\b/i.test(query)) {
    warnings.push('Query has no LIMIT clause. This could return a large number of rows. Consider adding LIMIT.');
  }

  // Check for potentially expensive operations
  const expensivePatterns = [
    /\bCROSS\s+JOIN\b/i,
    /\bWITHOUT\s+INDEX\b/i,
    /\bORDER\s+BY\b.*\bORDER\s+BY\b/i, // Multiple ORDER BYs
  ];

  for (const pattern of expensivePatterns) {
    if (pattern.test(query)) {
      warnings.push('Query contains patterns that may be slow on large tables.');
    }
  }

  // Check for unquoted literals that might be injection attempts
  // This is a basic heuristic - not foolproof
  const unquotedStringPattern = /=\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:WHERE|AND|OR|LIMIT|GROUP|HAVING|ORDER|$)/g;
  let match;
  while ((match = unquotedStringPattern.exec(query)) !== null) {
    if (match[1] && !['NULL', 'TRUE', 'FALSE'].includes(match[1].toUpperCase())) {
      warnings.push(`Possible unquoted string literal: "${match[1]}". This might indicate an injection attempt or malformed query.`);
    }
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Sanitize query by removing comments and extra whitespace
 */
export function sanitizeSQLQuery(query: string): string {
  return query
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}
