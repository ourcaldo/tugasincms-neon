import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
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
    
    const { data: tokens, error } = await supabase
      .from('api_tokens')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return successResponse(tokens || [], false)
  } catch (error) {
    console.error('Error fetching tokens:', error)
    return errorResponse('Failed to fetch tokens')
  }
}
