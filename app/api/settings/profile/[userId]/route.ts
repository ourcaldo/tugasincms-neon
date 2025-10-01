import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    console.log('🔍 Fetching user profile:', userId)
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ User not found:', userId)
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      throw error
    }
    
    if (!user) {
      console.log('❌ User not found:', userId)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    console.log('✅ User profile found:', user.email)
    return NextResponse.json(user)
  } catch (error: any) {
    console.error('❌ Error fetching profile:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch profile',
      details: error.message 
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { name, bio, avatar } = await request.json()
    
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
    
    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
