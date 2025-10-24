import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/database'
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
    
    const tokenResult = await sql`
      SELECT user_id FROM api_tokens
      WHERE id = ${tokenId}
      LIMIT 1
    `
    
    const token = tokenResult[0]
    
    if (token && token.user_id !== currentUserId) {
      return forbiddenResponse('You can only delete your own tokens')
    }
    
    await sql`
      DELETE FROM api_tokens
      WHERE id = ${tokenId}
    `
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting token:', error)
    return errorResponse('Failed to delete token')
  }
}
