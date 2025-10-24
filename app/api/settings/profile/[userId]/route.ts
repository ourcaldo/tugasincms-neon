import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, forbiddenResponse, notFoundResponse, validationErrorResponse } from '@/lib/response'
import { updateUserProfileSchema } from '@/lib/validation'

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
      return forbiddenResponse('You can only view your own profile')
    }
    
    const result = await sql`
      SELECT * FROM users
      WHERE id = ${userId}
      LIMIT 1
    `
    
    const user = result[0]
    
    if (!user) {
      return notFoundResponse('User not found')
    }
    
    return successResponse(user, false)
  } catch (error: any) {
    console.error('Error fetching profile:', error)
    return errorResponse('Failed to fetch profile')
  }
}

export async function PUT(
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
      return forbiddenResponse('You can only update your own profile')
    }
    
    const body = await request.json()
    
    const validation = updateUserProfileSchema.safeParse(body)
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }
    
    const { name, bio, avatar } = validation.data
    
    const result = await sql`
      UPDATE users
      SET name = ${name || null}, bio = ${bio || null}, avatar = ${avatar || null}, updated_at = NOW()
      WHERE id = ${userId}
      RETURNING *
    `
    
    const updatedUser = result[0]
    
    return successResponse(updatedUser, false)
  } catch (error) {
    console.error('Error updating profile:', error)
    return errorResponse('Failed to update profile')
  }
}
