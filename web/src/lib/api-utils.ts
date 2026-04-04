/**
 * Shared utilities for Next.js API routes that proxy to Mastra server
 */

const MASTRA_URL =
  process.env.MASTRA_URL ||
  process.env.NEXT_PUBLIC_MASTRA_URL ||
  "http://localhost:4111"

interface ProxyOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: any
  headers?: Record<string, string>
  timeout?: number
}

interface ProxyResult {
  ok: boolean
  status: number
  data?: any
  error?: string
}

/**
 * Proxy a request to the Mastra server with proper error handling
 */
export async function proxyToMastra(
  endpoint: string,
  options: ProxyOptions = {}
): Promise<ProxyResult> {
  const { method = "GET", body, headers = {}, timeout = 30000 } = options

  const targetUrl = `${MASTRA_URL}${endpoint}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(targetUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      return {
        ok: false,
        status: response.status,
        error: errorText || `HTTP ${response.status}`,
      }
    }

    const data = await response.json()
    return {
      ok: true,
      status: response.status,
      data,
    }
  } catch (error) {
    const isConnectionError =
      error instanceof Error &&
      (error.name === "AbortError" ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("fetch failed"))

    return {
      ok: false,
      status: isConnectionError ? 503 : 500,
      error: isConnectionError
        ? "Failed to connect to Mastra server"
        : error instanceof Error
          ? error.message
          : "Unknown error",
    }
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delay?: number; backoff?: number } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, backoff = 1.5 } = options

  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      const isLastAttempt = i === retries - 1
      const isConnectionError =
        error instanceof Error &&
        (error.message.includes("ECONNREFUSED") ||
          error.message.includes("fetch failed"))

      if (isLastAttempt || !isConnectionError) {
        throw error
      }

      await new Promise(resolve =>
        setTimeout(resolve, delay * Math.pow(backoff, i))
      )
    }
  }

  throw new Error("Retry failed")
}
