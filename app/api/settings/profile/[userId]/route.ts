import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
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
    
    console.log('🔍 Fetching user profile:', userId)
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ User not found:', userId)
        return notFoundResponse('User not found')
      }
      throw error
    }
    
    if (!user) {
      console.log('❌ User not found:', userId)
      return notFoundResponse('User not found')
    }
    
    console.log('✅ User profile found:', user.email)
    return successResponse(user, false)
  } catch (error: any) {
    console.error('❌ Error fetching profile:', error)
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
    
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({
        name,
        bio,
        avatar,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    
    return successResponse(updatedUser, false)
  } catch (error) {
    console.error('Error updating profile:', error)
    return errorResponse('Failed to update profile')
  }
}
