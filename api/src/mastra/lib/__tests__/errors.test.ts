/**
 * Tests for error handling - Critical tests only
 */

import { describe, expect, it } from "vitest"
import { createError, createSuccess, isFixableError } from "../errors.js"

describe("Error Handling", () => {
  it("should create error with known code", () => {
    const result = createError("DB_CONNECTION_FAILED")
    expect(result.success).toBe(false)
    expect(result.error.fixable).toBe(true)
  })

  it("should identify fixable errors", () => {
    const fixable = createError("DB_CONNECTION_FAILED")
    const notFixable = createError("AGENT_NOT_FOUND")
    expect(isFixableError(fixable)).toBe(true)
    expect(isFixableError(notFixable)).toBe(false)
  })

  it("should create success response", () => {
    const result = createSuccess({ id: 1 })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: 1 })
  })
})
