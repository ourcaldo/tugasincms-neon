import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
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
    
    const { data: updatedTag, error } = await supabase
      .from('tags')
      .update({
        name,
        slug,
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
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
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    await deleteCachedData('api:tags:*')
    await deleteCachedData('api:public:posts:*')
    await deleteCachedData('api:posts:*')
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting tag:', error)
    return errorResponse('Failed to delete tag')
  }
}
