import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCachedData, setCachedData } from '@/lib/cache'

const verifyApiToken = async (token: string) => {
  if (!token) return null
  
  try {
    const { data: apiToken, error } = await supabase
      .from('api_tokens')
      .select('*')
      .eq('token', token)
      .single()
    
    if (error || !apiToken) return null
    
    if (apiToken.expires_at && new Date(apiToken.expires_at) < new Date()) {
      return null
    }
    
    await supabase
      .from('api_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiToken.id)
    
    return apiToken
  } catch (error) {
    console.error('Error verifying token:', error)
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    const validToken = await verifyApiToken(token || '')
    
    if (!validToken) {
      return NextResponse.json({ success: false, error: 'Invalid or expired API token' }, { status: 401 })
    }
    
    const { id } = await params
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    const cacheKey = `api:public:posts:${isUUID ? 'id' : 'slug'}:${id}`
    
    const cachedPost = await getCachedData(cacheKey)
    if (cachedPost) {
      return NextResponse.json({ success: true, data: cachedPost, cached: true })
    }
    
    let query = supabase
      .from('posts')
      .select(`
        *,
        categories:post_categories(category:categories(*)),
        tags:post_tags(tag:tags(*))
      `)
      .eq('status', 'published')
    
    if (isUUID) {
      query = query.eq('id', id)
    } else {
      query = query.eq('slug', id)
    }
    
    const { data: post, error } = await query.single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 })
      }
      throw error
    }
    
    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 })
    }
    
    const postWithRelations = {
      ...post,
      categories: (post.categories || []).map((pc: any) => pc.category).filter(Boolean),
      tags: (post.tags || []).map((pt: any) => pt.tag).filter(Boolean),
    }
    
    await setCachedData(cacheKey, postWithRelations, 3600)
    
    return NextResponse.json({ success: true, data: postWithRelations, cached: false })
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch post' }, { status: 500 })
  }
}
