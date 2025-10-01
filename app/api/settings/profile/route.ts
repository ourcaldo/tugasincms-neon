import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { id, email, name, avatar } = await request.json()
    
    console.log('📝 Creating new user profile:', { id, email, name })
    
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        id,
        email,
        name,
        avatar,
      })
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error creating profile:', error)
      
      if (error.code === '23505') {
        console.log('⚠️ User already exists, fetching existing user...')
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single()
        
        if (fetchError) {
          console.error('❌ Error fetching existing user:', fetchError)
          throw fetchError
        }
        
        console.log('✅ Returning existing user:', existingUser)
        return NextResponse.json(existingUser, { status: 200 })
      }
      
      throw error
    }
    
    console.log('✅ User profile created successfully:', newUser)
    return NextResponse.json(newUser, { status: 201 })
  } catch (error: any) {
    console.error('❌ Failed to create profile:', error)
    return NextResponse.json({ 
      error: 'Failed to create profile',
      details: error.message 
    }, { status: 500 })
  }
}
