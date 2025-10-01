import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { name, slug } = await request.json()
    
    const { data: updatedTag, error } = await supabase
      .from('tags')
      .update({
        name,
        slug,
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json(updatedTag)
  } catch (error) {
    console.error('Error updating tag:', error)
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting tag:', error)
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 })
  }
}
