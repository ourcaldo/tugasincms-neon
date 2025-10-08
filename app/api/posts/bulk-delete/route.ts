import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getUserIdFromClerk } from '@/lib/auth'
import { successResponse, errorResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/response'
import { deleteCachedData } from '@/lib/cache'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromClerk()
    if (!userId) {
      return unauthorizedResponse('You must be logged in')
    }
    
    const body = await request.json()
    const { postIds } = body
    
    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return validationErrorResponse('postIds must be a non-empty array')
    }
    
    const { data: ownedPosts, error: fetchError } = await supabase
      .from('posts')
      .select('id')
      .in('id', postIds)
      .eq('author_id', userId)
    
    if (fetchError) throw fetchError
    
    if (!ownedPosts || ownedPosts.length === 0) {
      return validationErrorResponse('No posts found or you do not own these posts')
    }
    
    const ownedPostIds = ownedPosts.map(p => p.id)
    
    const { error: deleteTagsError } = await supabase
      .from('post_tags')
      .delete()
      .in('post_id', ownedPostIds)
    
    if (deleteTagsError) throw deleteTagsError
    
    const { error: deleteCategoriesError } = await supabase
      .from('post_categories')
      .delete()
      .in('post_id', ownedPostIds)
    
    if (deleteCategoriesError) throw deleteCategoriesError
    
    const { error: deletePostsError } = await supabase
      .from('posts')
      .delete()
      .in('id', ownedPostIds)
      .eq('author_id', userId)
    
    if (deletePostsError) throw deletePostsError
    
    await deleteCachedData('api:public:posts:*')
    await deleteCachedData(`api:posts:user:${userId}`)
    
    return successResponse({ 
      message: `${ownedPostIds.length} post(s) deleted successfully`,
      deletedIds: ownedPostIds
    }, false)
  } catch (error) {
    console.error('Error bulk deleting posts:', error)
    return errorResponse('Failed to delete posts')
  }
}
