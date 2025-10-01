import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: tags, error } = await supabase
      .from('tags')
      .select('*')
      .order('name')
    
    if (error) throw error
    
    return NextResponse.json(tags || [])
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, slug } = await request.json()
    
    const { data: newTag, error } = await supabase
      .from('tags')
      .insert({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(newTag, { status: 201 })
  } catch (error) {
    console.error('Error creating tag:', error)
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 })
  }
}
