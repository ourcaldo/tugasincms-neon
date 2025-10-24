import { NextRequest } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { userProfileSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const body = await request.json()
    
    const validation = userProfileSchema.safeParse(body)
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }
    
    const { id, email, name, avatar } = validation.data
    
    const result = await sql`
      INSERT INTO users (id, email, name, avatar)
      VALUES (${id}, ${email || null}, ${name || null}, ${avatar || null})
      ON CONFLICT (id)
      DO UPDATE SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        avatar = EXCLUDED.avatar,
        updated_at = NOW()
      RETURNING *
    `
    
    const user = result[0]
    
    return successResponse(user, false, 200)
  } catch (error: any) {
    console.error('Failed to upsert profile:', error)
    return errorResponse('Failed to create profile')
  }
}
