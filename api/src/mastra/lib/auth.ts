/**
 * Simple Authentication System
 *
 * Hardcoded credentials for basic access control.
 * For production, replace with proper auth system.
 */

import { sign, verify } from 'hono/jwt';
import type { JWTPayload } from 'hono/jwt';

// Configuration from environment
const AUTH_EMAIL = process.env.AUTH_EMAIL || 'admin@ai-analyst.dev';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || 'ai-analyst-secret-key-change-in-production';
const JWT_EXPIRY = '24h'; // Token expires in 24 hours

export interface AuthPayload extends JWTPayload {
  email: string;
  iat: number;
  exp: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * Verify credentials and generate JWT token
 */
export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  const { email, password } = credentials;

  // Simple hardcoded check
  if (email === AUTH_EMAIL && password === AUTH_PASSWORD) {
    const payload: AuthPayload = {
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };

    const token = await sign(payload, JWT_SECRET);

    return {
      success: true,
      token,
    };
  }

  return {
    success: false,
    error: 'Invalid email or password',
  };
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const payload = await verify(token, JWT_SECRET) as AuthPayload;
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Auth middleware for Hono routes
 */
export function authMiddleware() {
  return async (c: any, next: any) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized: Missing or invalid Authorization header' }, 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const payload = await verifyToken(token);
    if (!payload) {
      return c.json({ error: 'Unauthorized: Invalid or expired token' }, 401);
    }

    // Attach user info to context
    c.set('user', payload);
    await next();
  };
}

/**
 * Optional auth middleware - allows requests without auth, but adds user info if valid token provided
 */
export function optionalAuthMiddleware() {
  return async (c: any, next: any) => {
    const authHeader = c.req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await verifyToken(token);
      if (payload) {
        c.set('user', payload);
      }
    }

    await next();
  };
}

/**
 * Check if auth is enabled (can be disabled via env var for development)
 */
export function isAuthEnabled(): boolean {
  return process.env.AUTH_ENABLED !== 'false';
}
