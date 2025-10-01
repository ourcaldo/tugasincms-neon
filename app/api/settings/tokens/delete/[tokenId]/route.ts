import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  try {
    const { tokenId } = await params
    const { error } = await supabase
      .from('api_tokens')
      .delete()
      .eq('id', tokenId)
    
    if (error) throw error
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting token:', error)
    return NextResponse.json({ error: 'Failed to delete token' }, { status: 500 })
  }
}
