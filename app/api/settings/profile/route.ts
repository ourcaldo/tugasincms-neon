import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { id, email, name, avatar } = await request.json()
    
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
    return NextResponse.json(user, { status: 200 })
  } catch (error: any) {
    console.error('❌ Failed to upsert profile:', error)
    return NextResponse.json({ 
      error: 'Failed to create profile',
      details: error.message 
    }, { status: 500 })
  }
}
