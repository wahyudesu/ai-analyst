/**
 * Secure Request Context Storage
 *
 * Stores sensitive data (like database URLs) per-request
 * in a way that's accessible to tools but NOT exposed to the LLM.
 *
 * This uses AsyncLocalStorage to create request-scoped storage
 * that doesn't pollute the LLM's conversation history.
 */

import { AsyncLocalStorage } from "node:async_hooks"
import type { Context, Next } from "hono"

interface RequestContext {
  databaseUrl?: string
  sessionId?: string
  userId?: string
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>()

/**
 * Set the request context for the current request
 */
export function setRequestContext(context: RequestContext): void {
  const store = requestContextStorage.getStore() || {}
  Object.assign(store, context)
}

/**
 * Get the database URL from the current request context
 * This is accessible to tools but NOT exposed to LLM
 */
export function getDatabaseUrl(): string | undefined {
  const store = requestContextStorage.getStore()
  return store?.databaseUrl
}

/**
 * Get the full request context
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore()
}

/**
 * Run a function with the given request context
 * This is used by the API route to wrap request handling
 */
export function withRequestContext<T>(context: RequestContext, fn: () => T): T {
  return requestContextStorage.run(context, fn)
}

/**
 * Create a request context middleware for use in routes
 */
export function createRequestContextMiddleware() {
  return async (c: Context, next: Next) => {
    const body = await c.req.json().catch(() => ({}))

    const context: RequestContext = {
      databaseUrl: body.databaseUrl,
      sessionId: body.sessionId,
    }

    return withRequestContext(context, next)
  }
}
