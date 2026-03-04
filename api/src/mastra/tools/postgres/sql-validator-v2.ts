/**
 * SQL Query Validator v2 - Enhanced Security
 *
 * Improvements over v1:
 * - Better SQL injection detection
 * - Query complexity scoring
 * - More accurate pattern matching
 * - Structured error messages
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  code?: string;
  suggestions?: string[];
  warnings?: string[];
  complexityScore?: number;
}

export interface QueryAnalysis {
  hasJoin: boolean;
  joinCount: number;
  hasSubquery: boolean;
  subqueryDepth: number;
  hasAggregate: boolean;
  hasOrderBy: boolean;
  hasGroupBy: boolean;
  estimatedCost: 'low' | 'medium' | 'high';
}

/**
 * Analyze query complexity
 */
function analyzeQueryComplexity(query: string): QueryAnalysis {
  const upperQuery = query.toUpperCase();

  // Count JOINs
  const joinMatches = upperQuery.match(/\b(?:INNER\s+|LEFT\s+|RIGHT\s+|FULL\s+|CROSS\s+)?JOIN\b/g);
  const joinCount = joinMatches?.length || 0;

  // Detect subqueries (nested parentheses)
  const subqueryDepth = (query.match(/\(/g) || []).length;

  // Check for aggregations
  const hasAggregate = /\b(COUNT|SUM|AVG|MIN|MAX|STDDEV|VARIANCE)\s*\(/i.test(query);

  // Check for clauses
  const hasOrderBy = /\bORDER\s+BY\b/i.test(query);
  const hasGroupBy = /\bGROUP\s+BY\b/i.test(query);

  // Estimate cost
  let estimatedCost: 'low' | 'medium' | 'high' = 'low';
  if (joinCount > 3 || subqueryDepth > 2 || (hasAggregate && hasOrderBy)) {
    estimatedCost = 'high';
  } else if (joinCount > 1 || subqueryDepth > 0 || hasAggregate) {
    estimatedCost = 'medium';
  }

  return {
    hasJoin: joinCount > 0,
    joinCount,
    hasSubquery: subqueryDepth > 0,
    subqueryDepth,
    hasAggregate,
    hasOrderBy,
    hasGroupBy: hasGroupBy,
    estimatedCost,
  };
}

/**
 * Calculate complexity score (0-100, higher = more complex)
 */
function calculateComplexityScore(analysis: QueryAnalysis, queryLength: number): number {
  let score = 0;

  // Base score from query length
  score += Math.min(queryLength / 100, 10);

  // JOINs add complexity
  score += analysis.joinCount * 10;

  // Subqueries add significant complexity
  score += analysis.subqueryDepth * 15;

  // Aggregations with ORDER BY are expensive
  if (analysis.hasAggregate && analysis.hasOrderBy) {
    score += 15;
  }

  // GROUP BY adds complexity
  if (analysis.hasGroupBy) {
    score += 10;
  }

  return Math.min(score, 100);
}

/**
 * Enhanced SQL injection pattern detection
 */
function detectInjectionPatterns(query: string): { detected: boolean; pattern?: string; suggestion?: string } {
  const patterns = [
    {
      regex: /;\s*(?:DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE)\b/i,
      pattern: 'statement separator + DDL/DML',
      suggestion: 'Multi-statement queries are not allowed',
    },
    {
      regex: /'\s*(?:OR|AND)\s*['\d]/i,
      pattern: 'quoted OR/AND (possible tautology)',
      suggestion: 'This pattern looks like a SQL injection attempt',
    },
    {
      regex: /'\s*OR\s*'1'\s*=\s*'1/i,
      pattern: 'tautology injection',
      suggestion: 'This is a common SQL injection pattern',
    },
    {
      regex: /'\s*;\s*--/,
      pattern: 'comment injection',
      suggestion: 'Comments after quotes are often used in injection attacks',
    },
    {
      regex: /\/\*[^\*]*\*\/\s*(?:DROP|DELETE|INSERT)/i,
      pattern: 'block comment injection',
      suggestion: 'Block comments can hide malicious code',
    },
    {
      regex: /(?:UNION\s+ALL\s+)?UNION\s+SELECT/i,
      pattern: 'UNION-based injection',
      suggestion: 'UNION queries can extract data from other tables',
    },
    {
      regex: /\b(?:xp_|sp_OACreate|sp_adduser|sp_password)\b/i,
      pattern: 'stored procedure injection',
      suggestion: 'Extended stored procedures are not allowed',
    },
    {
      regex: /;\s*WAITFOR\s+DELAY\b/i,
      pattern: 'time-based injection',
      suggestion: 'Timing attacks are not allowed',
    },
    {
      regex: /'\s*\|\|?\s*'/,
      pattern: 'concatenation injection',
      suggestion: 'String concatenation in predicates is suspicious',
    },
    {
      regex: /\bCAST\s*\(\s*[^\)]+\s+AS\s+INT\s*\)\s*=/i,
      pattern: 'type casting injection',
      suggestion: 'Unusual type casting pattern',
    },
  ];

  for (const { regex, pattern, suggestion } of patterns) {
    if (regex.test(query)) {
      return { detected: true, pattern, suggestion };
    }
  }

  return { detected: false };
}

/**
 * Validate query structure and safety
 */
export function validateSQLQueryV2(query: string): ValidationResult {
  const trimmedQuery = query.trim();
  const trimmedQueryUpper = trimmedQuery.toUpperCase();
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Must start with SELECT (read-only enforcement)
  if (!trimmedQueryUpper.startsWith('SELECT')) {
    return {
      isValid: false,
      code: 'NOT_SELECT',
      error: 'Only SELECT queries are allowed for security.',
      suggestions: [
        'Use SELECT to read data',
        'INSERT, UPDATE, DELETE, DROP, ALTER, etc. are not permitted',
      ],
    };
  }

  // Block multi-statement queries
  const semicolonCount = (trimmedQuery.match(/;/g) || []).length;
  if (semicolonCount > 1) {
    return {
      isValid: false,
      code: 'MULTI_STATEMENT',
      error: 'Multi-statement queries are not allowed.',
      suggestions: ['Split into separate queries', 'Use a subquery instead of multiple statements'],
    };
  }

  // Check for SQL injection patterns
  const injectionCheck = detectInjectionPatterns(trimmedQuery);
  if (injectionCheck.detected) {
    return {
      isValid: false,
      code: 'INJECTION_DETECTED',
      error: `Query contains suspicious pattern: ${injectionCheck.pattern}`,
      suggestions: [injectionCheck.suggestion || 'Review and simplify the query'],
    };
  }

  // Check for comment-based injection
  if (/(--)|(\/\*)|(\*\/)/.test(trimmedQuery)) {
    // Only allow comments in specific positions
    const lines = trimmedQuery.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('--') && !trimmedLine.startsWith('-- ')) {
        // Allow proper SQL comments (-- with space)
        continue;
      }
      // Check for comments in middle of line (suspicious)
      if (/\S\s+--/.test(line) || /\S\s+\/\*/.test(line)) {
        return {
          isValid: false,
          code: 'COMMENT_INJECTION',
          error: 'SQL comments in the middle of a query are not allowed.',
          suggestions: ['Remove comments from the query', 'Ensure query is a single statement'],
        };
      }
    }
  }

  // Analyze complexity
  const analysis = analyzeQueryComplexity(trimmedQuery);
  const complexityScore = calculateComplexityScore(analysis, trimmedQuery.length);

  // Warn about complex queries
  if (complexityScore > 50) {
    warnings.push(`Query complexity score: ${complexityScore}/100. This may be slow.`);
  }

  // Check for excessive JOINs
  if (analysis.joinCount > 5) {
    return {
      isValid: false,
      code: 'EXCESSIVE_JOINS',
      error: `Query has too many JOINs (${analysis.joinCount}). Maximum allowed is 5.`,
      suggestions: ['Consider breaking into multiple queries', 'Use a subquery or CTE'],
    };
  }

  // Check for deep subquery nesting
  if (analysis.subqueryDepth > 3) {
    return {
      isValid: false,
      code: 'DEEP_NESTING',
      error: `Query has too many nested subqueries (${analysis.subqueryDepth}). Maximum allowed is 3.`,
      suggestions: ['Use CTEs (WITH clause) to simplify', 'Break into multiple queries'],
    };
  }

  // Check for missing LIMIT on large queries
  if (!/\bLIMIT\b/i.test(trimmedQuery) && !/\bFETCH\s+FIRST\b/i.test(trimmedQuery)) {
    if (analysis.estimatedCost === 'high') {
      suggestions.push('Add LIMIT clause to prevent large result sets');
    } else {
      warnings.push('Query has no LIMIT clause. Consider adding one for performance.');
    }
  }

  // Check for SELECT *
  if (/\bSELECT\s+\*\b/i.test(trimmedQuery)) {
    warnings.push('SELECT * can return unnecessary data. Specify explicit columns.');
  }

  // Check for dangerous functions
  const dangerousFunctions = [
    'pg_sleep',
    'lo_export',
    'lo_import',
    'pg_read_file',
    'pg_ls_dir',
  ];
  for (const func of dangerousFunctions) {
    if (trimmedQueryUpper.includes(func.toUpperCase())) {
      return {
        isValid: false,
        code: 'DANGEROUS_FUNCTION',
        error: `Function ${func} is not allowed for security reasons.`,
        suggestions: ['Use alternative approaches', 'Contact administrator if this is needed'],
      };
    }
  }

  // Check for COPY/EXECUTE
  if (/\b(COPY|EXECUTE)\b/i.test(trimmedQuery)) {
    return {
      isValid: false,
      code: 'DANGEROUS_COMMAND',
      error: 'COPY and EXECUTE commands are not allowed.',
      suggestions: ['Use regular SELECT queries', 'Contact administrator for data export'],
    };
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    complexityScore,
  };
}

/**
 * Sanitize query (remove trailing semicolon, normalize whitespace)
 */
export function sanitizeSQLQueryV2(query: string): string {
  let sanitized = query;

  // Remove trailing semicolon if present
  sanitized = sanitized.trim().replace(/;$/, '');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized.trim();
}

/**
 * Parse query to extract metadata
 */
export function parseQueryMetadata(query: string): {
  tables: string[];
  columns: string[];
  hasAggregate: boolean;
  hasGroupBy: boolean;
  hasOrderBy: boolean;
} {
  const tables: string[] = [];
  const columns: string[] = [];

  // Extract table names after FROM and JOIN
  const fromJoinMatches = query.matchAll(/\b(?:FROM|JOIN)\s+([^\s,]+)/gi);
  for (const match of fromJoinMatches) {
    if (match[1]) {
      const table = match[1].replace(/['"]/g, '');
      if (!tables.includes(table)) {
        tables.push(table);
      }
    }
  }

  // Extract columns from SELECT clause
  const selectMatch = query.match(/SELECT\s+(.*?)\s+FROM/i);
  if (selectMatch && selectMatch[1]) {
    const selectClause = selectMatch[1];
    if (selectClause.trim() !== '*') {
      const columnParts = selectClause.split(',');
      for (const col of columnParts) {
        const cleanCol = col.trim().split(/\s+AS\s+/i)[0].replace(/['"]/g, '');
        if (cleanCol && !cleanCol.includes('(')) {
          columns.push(cleanCol);
        }
      }
    }
  }

  return {
    tables,
    columns,
    hasAggregate: /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(query),
    hasGroupBy: /\bGROUP\s+BY\b/i.test(query),
    hasOrderBy: /\bORDER\s+BY\b/i.test(query),
  };
}

// Re-export for backwards compatibility
export const validateSQLQuery = validateSQLQueryV2;
export const sanitizeSQLQuery = sanitizeSQLQueryV2;
