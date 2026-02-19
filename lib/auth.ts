import { sql } from '@/lib/database'
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { unauthorizedResponse, errorResponse } from './response'
import { setCorsHeaders, handleCorsPreflightRequest } from './cors'
import { createHash } from 'crypto'

export interface ApiToken {
  id: string
  user_id: string
  token: string
  name: string
  expires_at: string | null
  last_used_at: string | null
  created_at: string
}

/**
 * Hash a raw API token with SHA-256 for storage/comparison.
 * C-2: Tokens are stored hashed so a DB breach doesn't expose them.
 */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export const verifyApiToken = async (token: string): Promise<ApiToken | null> => {
  if (!token) return null
  
  try {
    const tokenHash = hashToken(token)
    
    // C-2: Compare hashed token; H-2: select only needed columns
    const result = await sql`
      SELECT id, user_id, name, expires_at, last_used_at, created_at
      FROM api_tokens
      WHERE token = ${tokenHash}
      LIMIT 1
    `
    
    const apiToken = result[0] as ApiToken | undefined
    
    if (!apiToken) return null
    
    if (apiToken.expires_at && new Date(apiToken.expires_at) < new Date()) {
      return null
    }
    
    // M-7: Throttle last_used_at writes — only update if >1 minute stale
    const lastUsed = apiToken.last_used_at ? new Date(apiToken.last_used_at).getTime() : 0
    if (Date.now() - lastUsed > 60_000) {
      await sql`
        UPDATE api_tokens
        SET last_used_at = ${new Date().toISOString()}
        WHERE id = ${apiToken.id}
      `
    }
    
    return apiToken
  } catch (error) {
    console.error('Error verifying token:', error)
    return null
  }
}

export const getUserIdFromClerk = async (): Promise<string | null> => {
  try {
    const { userId } = await auth()
    return userId
  } catch (error) {
    console.error('Error getting user from Clerk:', error)
    return null
  }
}

export const extractBearerToken = (request: NextRequest): string | null => {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  // H-1: Verify scheme is actually Bearer, not just any auth header
  if (!authHeader.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}

// ── Auth Wrappers ───────────────────────────────────────────────────────
// Eliminate repeated auth boilerplate in route handlers.

/**
 * Wraps an internal CMS route handler with Clerk authentication.
 * Automatically returns 401 if user is not logged in.
 *
 * Usage:
 *   export const GET = withClerkAuth(async (request, userId) => { ... })
 */
export function withClerkAuth(
  handler: (request: NextRequest, userId: string) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const userId = await getUserIdFromClerk()
      if (!userId) {
        return unauthorizedResponse('You must be logged in')
      }
      return await handler(request, userId)
    } catch (error) {
      console.error('Unhandled error in route handler:', error)
      return errorResponse('Internal server error')
    }
  }
}

/**
 * Wraps a public v1 API route handler with Bearer token auth + CORS.
 * Automatically handles token verification and CORS headers.
 *
 * Usage:
 *   export const GET = withApiTokenAuth(async (request, token, origin) => {
 *     // token is the verified ApiToken object
 *     return setCorsHeaders(successResponse(data), origin)
 *   })
 *
 *   export { apiTokenOptions as OPTIONS } from '@/lib/auth'
 */
export function withApiTokenAuth(
  handler: (request: NextRequest, token: ApiToken, origin: string | null) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const origin = request.headers.get('origin')
    try {
      const bearerToken = extractBearerToken(request)
      const validToken = await verifyApiToken(bearerToken || '')
      if (!validToken) {
        return setCorsHeaders(unauthorizedResponse('Invalid or expired API token'), origin)
      }
      const response = await handler(request, validToken, origin)
      return response
    } catch (error) {
      console.error('Unhandled error in v1 route handler:', error)
      return setCorsHeaders(errorResponse('Internal server error'), origin)
    }
  }
}

/**
 * Shared CORS OPTIONS handler for v1 API routes.
 * Usage: export { apiTokenOptions as OPTIONS } from '@/lib/auth'
 */
export async function apiTokenOptions(request: NextRequest) {
  const origin = request.headers.get('origin')
  return handleCorsPreflightRequest(origin)
}
