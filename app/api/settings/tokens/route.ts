import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { tokenSchema } from '@/lib/validation'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getUserIdFromClerk()
    if (!currentUserId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const body = await request.json()
    
    const validation = tokenSchema.safeParse(body)
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }
    
    const { userId, name, expiresAt } = validation.data
    
    const token = nanoid(32)
    
    const result = await sql`
      INSERT INTO api_tokens (user_id, token, name, expires_at)
      VALUES (${userId}, ${token}, ${name}, ${expiresAt || null})
      RETURNING *
    `
    
    const newToken = result[0]
    
    return successResponse(newToken, false, 201)
  } catch (error) {
    console.error('Error creating token:', error)
    return errorResponse('Failed to create token')
  }
}
