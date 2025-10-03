import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
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
    
    const { data: updatedCategory, error } = await supabase
      .from('categories')
      .update({
        name,
        slug,
        description,
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    await deleteCachedData('api:categories:*')
    await deleteCachedData('api:public:posts:*')
    await deleteCachedData('api:posts:*')
    
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
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    await deleteCachedData('api:categories:*')
    await deleteCachedData('api:public:posts:*')
    await deleteCachedData('api:posts:*')
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting category:', error)
    return errorResponse('Failed to delete category')
  }
}
