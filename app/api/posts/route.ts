import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { mapPostsFromDB, mapPostFromDB } from '@/lib/post-mapper'
import { getCachedData, setCachedData, deleteCachedData } from '@/lib/cache'
import { postSchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const cacheKey = `api:posts:user:${userId}`
    
    const cachedPosts = await getCachedData(cacheKey)
    if (cachedPosts) {
      return successResponse(cachedPosts, true)
    }
    
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        categories:post_categories(category:categories(*)),
        tags:post_tags(tag:tags(*))
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    const postsWithRelations = mapPostsFromDB(posts || [])
    
    await setCachedData(cacheKey, postsWithRelations, 300)
    
    return successResponse(postsWithRelations, false)
  } catch (error) {
    console.error('Error fetching posts:', error)
    return errorResponse('Failed to fetch posts')
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const body = await request.json()
    
    const validation = postSchema.safeParse(body)
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues[0].message)
    }
    
    const { title, content, excerpt, slug, featuredImage, publishDate, status, seo, categories, tags } = validation.data
    
    const { data: newPost, error } = await supabase
      .from('posts')
      .insert({
        title,
        content,
        excerpt,
        slug,
        featured_image: featuredImage,
        publish_date: publishDate || new Date().toISOString(),
        status: status || 'draft',
        author_id: userId,
        seo_title: seo?.title,
        meta_description: seo?.metaDescription,
        focus_keyword: seo?.focusKeyword,
      })
      .select()
      .single()
    
    if (error) throw error
    
    if (categories && categories.length > 0) {
      const categoryInserts = categories.map((catId: string) => ({
        post_id: newPost.id,
        category_id: catId,
      }))
      await supabase.from('post_categories').insert(categoryInserts)
    }
    
    if (tags && tags.length > 0) {
      const tagInserts = tags.map((tagId: string) => ({
        post_id: newPost.id,
        tag_id: tagId,
      }))
      await supabase.from('post_tags').insert(tagInserts)
    }
    
    await deleteCachedData('api:public:posts:*')
    await deleteCachedData(`api:posts:user:${userId}`)
    
    const { data: fullPost, error: fetchError } = await supabase
      .from('posts')
      .select(`
        *,
        categories:post_categories(category:categories(*)),
        tags:post_tags(tag:tags(*))
      `)
      .eq('id', newPost.id)
      .single()
    
    if (fetchError) throw fetchError
    
    return successResponse(mapPostFromDB(fullPost), false, 201)
  } catch (error) {
    console.error('Error creating post:', error)
    return errorResponse('Failed to create post')
  }
}
