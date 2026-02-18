import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { deleteCachedData } from '@/lib/cache'
import { categorySchema } from '@/lib/validation'

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
    
    const validation = categorySchema.safeParse(body)
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }
    
    const { name, slug, description } = validation.data
    
    // H-7: Check slug uniqueness before updating
    if (slug) {
      const slugExists = await sql`
        SELECT id FROM categories WHERE slug = ${slug} AND id != ${id}
      `
      if (slugExists.length > 0) {
        return validationErrorResponse('A category with this slug already exists')
      }
    }
    
    const result = await sql`
      UPDATE categories
      SET name = ${name}, slug = ${slug}, description = ${description || null}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    
    if (!result || result.length === 0) {
      return errorResponse('Category not found')
    }
    
    const updatedCategory = result[0]
    
    await deleteCachedData('api:categories:*')
    await deleteCachedData('api:public:posts:*')
    await deleteCachedData('api:posts:*')
    await deleteCachedData('api:v1:categories:*')
    await deleteCachedData('api:v1:posts:*')
    
    return successResponse(updatedCategory, false)
  } catch (error) {
    console.error('Error updating category:', error)
    return errorResponse('Failed to update category')
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
    
    // H-11: Check if category exists before deleting
    const existing = await sql`SELECT id FROM categories WHERE id = ${id}`
    if (!existing || existing.length === 0) {
      return errorResponse('Category not found')
    }
    
    await sql`
      DELETE FROM categories
      WHERE id = ${id}
    `
    
    await deleteCachedData('api:categories:*')
    await deleteCachedData('api:public:posts:*')
    await deleteCachedData('api:posts:*')
    await deleteCachedData('api:v1:categories:*')
    await deleteCachedData('api:v1:posts:*')
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting category:', error)
    return errorResponse('Failed to delete category')
  }
}
