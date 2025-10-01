import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/src/lib/supabase'

export async function GET() {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    
    if (error) throw error
    
    return NextResponse.json(categories || [])
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, slug, description } = await request.json()
    
    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        description,
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(newCategory, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
