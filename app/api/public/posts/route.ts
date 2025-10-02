import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getCachedData, setCachedData, deleteCachedData } from '@/lib/cache'

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

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    const validToken = await verifyApiToken(token || '')
    
    if (!validToken) {
      return NextResponse.json({ success: false, error: 'Invalid or expired API token' }, { status: 401 })
    }
    
    const cacheKey = 'api:public:posts:all'
    
    const cachedPosts = await getCachedData(cacheKey)
    if (cachedPosts) {
      return NextResponse.json({ success: true, data: cachedPosts, cached: true })
    }
    
    const { data: publishedPosts, error } = await supabase
      .from('posts')
      .select(`
        *,
        categories:post_categories(category:categories(*)),
        tags:post_tags(tag:tags(*))
      `)
      .eq('status', 'published')
      .order('publish_date', { ascending: false })
    
    if (error) throw error
    
    const postsWithRelations = (publishedPosts || []).map((post) => ({
      ...post,
      categories: (post.categories || []).map((pc: any) => pc.category).filter(Boolean),
      tags: (post.tags || []).map((pt: any) => pt.tag).filter(Boolean),
    }))
    
    await setCachedData(cacheKey, postsWithRelations, 300)
    
    return NextResponse.json({ success: true, data: postsWithRelations, cached: false })
  } catch (error) {
    console.error('Error fetching published posts:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch posts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    const validToken = await verifyApiToken(token || '')
    
    if (!validToken) {
      return NextResponse.json({ success: false, error: 'Invalid or expired API token' }, { status: 401 })
    }
    
    const body = await request.json()
    const { title, content, excerpt, slug, featuredImage, publishDate, status, seo, categories, tags } = body
    
    const postPublishDate = publishDate || new Date().toISOString()
    const isFutureDate = new Date(postPublishDate) > new Date()
    
    let postStatus = status
    if (!postStatus) {
      postStatus = isFutureDate ? 'scheduled' : 'draft'
    } else if (postStatus === 'scheduled' && !isFutureDate) {
      postStatus = 'published'
    }
    
    const { data: newPost, error } = await supabase
      .from('posts')
      .insert({
        title,
        content,
        excerpt,
        slug,
        featured_image: featuredImage,
        publish_date: postPublishDate,
        status: postStatus,
        author_id: validToken.user_id,
        seo_title: seo?.title,
        meta_description: seo?.metaDescription,
        focus_keyword: seo?.focusKeyword,
      })
      .select()
      .single()
    
    if (error) throw error
    
    if (Array.isArray(categories) && categories.length > 0) {
      const categoryInserts = categories.map((catId: string) => ({
        post_id: newPost.id,
        category_id: catId,
      }))
      await supabase.from('post_categories').insert(categoryInserts)
    }
    
    if (Array.isArray(tags) && tags.length > 0) {
      const tagInserts = tags.map((tagId: string) => ({
        post_id: newPost.id,
        tag_id: tagId,
      }))
      await supabase.from('post_tags').insert(tagInserts)
    }
    
    await deleteCachedData('api:public:posts:*')
    
    return NextResponse.json({ success: true, data: newPost }, { status: 201 })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ success: false, error: 'Failed to create post' }, { status: 500 })
  }
}
