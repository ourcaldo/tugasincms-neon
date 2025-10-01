import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/src/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { name, slug, description } = await request.json()
    
    const { data: updatedCategory, error } = await supabase
      .from('categories')
      .update({
        name,
        slug,
        description,
      })
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', params.id)
    
    if (error) throw error
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
