import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/response'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUserId = await getUserIdFromClerk()
    if (!currentUserId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { userId } = await params
    
    if (currentUserId !== userId) {
      return forbiddenResponse('You can only view your own tokens')
    }
    
    const tokens = await sql`
      SELECT * FROM api_tokens
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `
    
    return successResponse(tokens || [], false)
  } catch (error) {
    console.error('Error fetching tokens:', error)
    return errorResponse('Failed to fetch tokens')
  }
}
