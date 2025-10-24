import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { deleteCachedData } from '@/lib/cache'
import { tagSchema } from '@/lib/validation'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { id } = await params
    const body = await request.json()
    
    const validation = tagSchema.safeParse(body)
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }
    
    const { name, slug } = validation.data
    
    const result = await sql`
      UPDATE tags
      SET name = ${name}, slug = ${slug}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    
    const updatedTag = result[0]
    
    await deleteCachedData('api:tags:*')
    await deleteCachedData('api:public:posts:*')
    await deleteCachedData('api:posts:*')
    
    return successResponse(updatedTag, false)
  } catch (error) {
    console.error('Error updating tag:', error)
    return errorResponse('Failed to update tag')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { id } = await params
    await sql`
      DELETE FROM tags
      WHERE id = ${id}
    `
    
    await deleteCachedData('api:tags:*')
    await deleteCachedData('api:public:posts:*')
    await deleteCachedData('api:posts:*')
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting tag:', error)
    return errorResponse('Failed to delete tag')
  }
}
