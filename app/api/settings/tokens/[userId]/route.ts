import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { data: tokens, error } = await supabase
      .from('api_tokens')
      .select('*')
      .eq('user_id', params.userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json(tokens || [])
  } catch (error) {
    console.error('Error fetching tokens:', error)
    return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 })
  }
}
