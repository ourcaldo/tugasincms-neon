import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
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
    
    console.log('📝 Upserting user profile:', { id, email, name })
    
    const { data: user, error } = await supabase
      .from('users')
      .upsert({
        id,
        email,
        name,
        avatar,
      }, {
        onConflict: 'id'
      })
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error upserting profile:', error)
      throw error
    }
    
    console.log('✅ User profile upserted successfully:', user)
    return successResponse(user, false, 200)
  } catch (error: any) {
    console.error('❌ Failed to upsert profile:', error)
    return errorResponse('Failed to create profile')
  }
}
