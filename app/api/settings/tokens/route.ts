import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk, getUserRole, hashToken } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, validationErrorResponse } from '@/lib/response'
import { tokenSchema } from '@/lib/validation'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getUserIdFromClerk()
    if (!currentUserId) {
      return unauthorizedResponse('You must be logged in')
    }

    const role = await getUserRole(currentUserId)
    if (role !== 'super_admin') {
      return forbiddenResponse('Only super admins can manage API tokens')
    }
    
    const body = await request.json()
    
    const validation = tokenSchema.safeParse(body)
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }
    
    const { userId, name, expiresAt } = validation.data
    
    // C-1: Prevent IDOR — only allow creating tokens for yourself
    if (userId !== currentUserId) {
      return forbiddenResponse('You can only create tokens for your own account')
    }
    
    const rawToken = nanoid(32)
    const tokenHash = hashToken(rawToken)
    
    const result = await sql`
      INSERT INTO api_tokens (user_id, token, name, expires_at)
      VALUES (${userId}, ${tokenHash}, ${name}, ${expiresAt || null})
      RETURNING id, user_id, name, expires_at, created_at, last_used_at
    `
    
    const newToken = result[0]
    
    // Return raw token only once at creation — it's stored hashed
    return successResponse({ ...newToken, token: rawToken }, false, 201)
  } catch (error) {
    console.error('Error creating token:', error)
    return errorResponse('Failed to create token')
  }
}
