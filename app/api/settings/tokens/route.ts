import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/src/lib/supabase'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  try {
    const { userId, name, expiresAt } = await request.json()
    
    const token = nanoid(32)
    
    const { data: newToken, error } = await supabase
      .from('api_tokens')
      .insert({
        user_id: userId,
        token,
        name,
        expires_at: expiresAt,
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(newToken, { status: 201 })
  } catch (error) {
    console.error('Error creating token:', error)
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
  }
}
