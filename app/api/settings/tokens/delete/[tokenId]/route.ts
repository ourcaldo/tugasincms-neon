import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserIdFromClerk } from '@/lib/auth'
import { errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/response'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const currentUserId = await getUserIdFromClerk()
    if (!currentUserId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const { tokenId } = await params
    
    const { data: token } = await supabase
      .from('api_tokens')
      .select('user_id')
      .eq('id', tokenId)
      .single()
    
    if (token && token.user_id !== currentUserId) {
      return forbiddenResponse('You can only delete your own tokens')
    }
    
    const { error } = await supabase
      .from('api_tokens')
      .delete()
      .eq('id', tokenId)
    
    if (error) throw error
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting token:', error)
    return errorResponse('Failed to delete token')
  }
}
