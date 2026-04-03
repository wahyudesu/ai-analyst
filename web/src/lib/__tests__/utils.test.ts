/**
 * Tests for utilities - Critical tests only
 */

import { describe, it, expect } from 'vitest';
import { cn } from '../utils.js';

describe('cn utility', () => {
  it('should merge classes', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('should handle conditional classes', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });

  it('should handle undefined/null', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b');
  });

  it('should merge conflicting tailwind classes', () => {
    const result = cn('text-sm text-lg', 'text-red-500');
    expect(result).toContain('text-red-500');
    expect(result).not.toContain('text-sm');
  });
});
